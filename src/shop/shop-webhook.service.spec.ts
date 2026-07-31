import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ShopWebhookService } from './shop-webhook.service';
import { StripeService } from './stripe.service';
import { ShopNotifierService } from './shop-notifier.service';
import { PrismaService } from '../prisma.service';

describe('ShopWebhookService', () => {
  let service: ShopWebhookService;

  const mockStripe = { constructWebhookEvent: jest.fn() };
  const mockPrisma = { order: { updateMany: jest.fn(), findUniqueOrThrow: jest.fn() } };
  const mockNotifier = { notifyNewOrder: jest.fn() };

  const payload = Buffer.from('{}');
  const signature = 't=1,v1=abc';

  const completedEvent = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        payment_intent: 'pi_test_1',
        amount_total: 11570,
        currency: 'eur',
        customer_details: { email: 'client@example.com', name: 'Jean Dupont' },
        shipping_cost: { amount_total: 590 },
        // Stripe expose l'adresse sous collected_information depuis l'API 2025+
        collected_information: {
          shipping_details: {
            name: 'Jean Dupont',
            address: { line1: '1 rue du Test', postal_code: '75001', city: 'Paris', country: 'FR' },
          },
        },
        metadata: { orderId: '42', orderReference: 'DVG-2026-0001' },
      },
    },
  };

  const paidOrder = {
    id: 42,
    reference: 'DVG-2026-0001',
    customerEmail: 'client@example.com',
    items: [],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopWebhookService,
        { provide: StripeService, useValue: mockStripe },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShopNotifierService, useValue: mockNotifier },
      ],
    }).compile();
    service = module.get(ShopWebhookService);
  });

  describe('vérification de signature', () => {
    it('rejette un événement à signature invalide sans rien écrire', async () => {
      mockStripe.constructWebhookEvent.mockImplementation(() => {
        throw new Error('signature invalide');
      });

      await expect(service.handleEvent(payload, signature)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockNotifier.notifyNewOrder).not.toHaveBeenCalled();
    });
  });

  describe('checkout.session.completed', () => {
    beforeEach(() => {
      mockStripe.constructWebhookEvent.mockReturnValue(completedEvent);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(paidOrder);
    });

    it('bascule la commande en PAID avec les informations du client', async () => {
      await service.handleEvent(payload, signature);

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 42, status: 'PENDING' },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            status: 'PAID',
            stripeSessionId: 'cs_test_1',
            stripePaymentIntentId: 'pi_test_1',
            customerEmail: 'client@example.com',
            customerName: 'Jean Dupont',
          }),
        }),
      );
    });

    it('notifie l’équipe une fois la commande payée', async () => {
      await service.handleEvent(payload, signature);

      expect(mockNotifier.notifyNewOrder).toHaveBeenCalledWith(paidOrder);
    });

    it('ignore un rejeu : aucune seconde notification', async () => {
      // Le filtre sur status PENDING ne matche plus : la commande est deja payee.
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      await service.handleEvent(payload, signature);

      expect(mockNotifier.notifyNewOrder).not.toHaveBeenCalled();
      expect(mockPrisma.order.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('ignore une session sans orderId exploitable', async () => {
      mockStripe.constructWebhookEvent.mockReturnValue({
        ...completedEvent,
        data: { object: { ...completedEvent.data.object, metadata: {} } },
      });

      await service.handleEvent(payload, signature);

      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('n’annule pas la commande si la notification échoue', async () => {
      // La commande est payee : elle doit exister meme si aucun mail ne part.
      mockNotifier.notifyNewOrder.mockRejectedValue(new Error('SMTP down'));

      await expect(service.handleEvent(payload, signature)).resolves.toBeUndefined();
      expect(mockPrisma.order.updateMany).toHaveBeenCalled();
    });
  });

  describe('autres événements', () => {
    it('ignore un type d’événement non géré', async () => {
      mockStripe.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.created',
        data: { object: {} },
      });

      await service.handleEvent(payload, signature);

      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });
  });
});
