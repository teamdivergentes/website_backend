import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ShopWebhookService } from './shop-webhook.service';
import { StripeService } from './stripe.service';
import { OrderReferenceService } from './order-reference.service';
import { ShopNotifierService } from './shop-notifier.service';
import { PrismaService } from '../prisma.service';

describe('ShopWebhookService', () => {
  let service: ShopWebhookService;

  const mockStripe = { constructWebhookEvent: jest.fn() };
  const mockPrisma = { order: { create: jest.fn() } };
  const mockReference = { generate: jest.fn() };
  const mockNotifier = { notifyNewOrder: jest.fn() };

  const payload = Buffer.from('{}');
  const signature = 't=1,v1=abc';

  const completedEvent = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        payment_intent: 'pi_test_1',
        amount_total: 4390,
        currency: 'eur',
        customer_details: {
          email: 'client@example.com',
          name: 'Jean Dupont',
        },
        shipping_cost: { amount_total: 400 },
        // Stripe expose l'adresse sous collected_information depuis l'API 2025+
        collected_information: {
          shipping_details: {
            name: 'Jean Dupont',
            address: { line1: '1 rue du Test', postal_code: '75001', city: 'Paris', country: 'FR' },
          },
        },
        metadata: {
          productId: 'maillotDvg_2023',
          productName: 'MAILLOT 2023',
          size: 'M',
          quantity: '1',
          unitPriceCents: '3990',
        },
      },
    },
  };

  const createdOrder = { id: 1, reference: 'DVG-2026-0001', customerEmail: 'client@example.com' };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopWebhookService,
        { provide: StripeService, useValue: mockStripe },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrderReferenceService, useValue: mockReference },
        { provide: ShopNotifierService, useValue: mockNotifier },
      ],
    }).compile();
    service = module.get<ShopWebhookService>(ShopWebhookService);
  });

  it('rejette un événement à signature invalide sans rien écrire', async () => {
    mockStripe.constructWebhookEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature');
    });

    await expect(service.handleEvent(payload, signature)).rejects.toThrow(BadRequestException);
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(mockNotifier.notifyNewOrder).not.toHaveBeenCalled();
  });

  it('ignore les événements autres que checkout.session.completed', async () => {
    mockStripe.constructWebhookEvent.mockReturnValue({ type: 'payment_intent.created', data: {} });

    await service.handleEvent(payload, signature);

    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });

  it('crée la commande à partir des métadonnées de la session', async () => {
    mockStripe.constructWebhookEvent.mockReturnValue(completedEvent);
    mockReference.generate.mockResolvedValue('DVG-2026-0001');
    mockPrisma.order.create.mockResolvedValue(createdOrder);

    await service.handleEvent(payload, signature);

    expect(mockPrisma.order.create).toHaveBeenCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: expect.objectContaining({
        reference: 'DVG-2026-0001',
        stripeSessionId: 'cs_test_1',
        stripePaymentIntentId: 'pi_test_1',
        productId: 'maillotDvg_2023',
        productName: 'MAILLOT 2023',
        size: 'M',
        quantity: 1,
        unitPriceCents: 3990,
        shippingCents: 400,
        totalCents: 4390,
        customerEmail: 'client@example.com',
        customerName: 'Jean Dupont',
        status: 'PAID',
      }),
    });
  });

  it('enregistre size à null pour un produit sans taille', async () => {
    mockStripe.constructWebhookEvent.mockReturnValue({
      ...completedEvent,
      data: {
        object: {
          ...completedEvent.data.object,
          metadata: { ...completedEvent.data.object.metadata, size: '' },
        },
      },
    });
    mockReference.generate.mockResolvedValue('DVG-2026-0002');
    mockPrisma.order.create.mockResolvedValue(createdOrder);

    await service.handleEvent(payload, signature);

    expect(mockPrisma.order.create).toHaveBeenCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: expect.objectContaining({ size: null }),
    });
  });

  it("absorbe un rejeu : une violation d'unicité ne remonte pas d'erreur", async () => {
    mockStripe.constructWebhookEvent.mockReturnValue(completedEvent);
    mockReference.generate.mockResolvedValue('DVG-2026-0003');
    mockPrisma.order.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['stripeSessionId'] },
    });

    await expect(service.handleEvent(payload, signature)).resolves.toBeUndefined();
    expect(mockNotifier.notifyNewOrder).not.toHaveBeenCalled();
  });

  it('notifie après création réussie', async () => {
    mockStripe.constructWebhookEvent.mockReturnValue(completedEvent);
    mockReference.generate.mockResolvedValue('DVG-2026-0004');
    mockPrisma.order.create.mockResolvedValue(createdOrder);

    await service.handleEvent(payload, signature);

    expect(mockNotifier.notifyNewOrder).toHaveBeenCalledWith(createdOrder);
  });

  it("n'échoue pas si la notification échoue : la commande est déjà payée", async () => {
    mockStripe.constructWebhookEvent.mockReturnValue(completedEvent);
    mockReference.generate.mockResolvedValue('DVG-2026-0005');
    mockPrisma.order.create.mockResolvedValue(createdOrder);
    mockNotifier.notifyNewOrder.mockRejectedValue(new Error('Discord indisponible'));

    await expect(service.handleEvent(payload, signature)).resolves.toBeUndefined();
  });
});
