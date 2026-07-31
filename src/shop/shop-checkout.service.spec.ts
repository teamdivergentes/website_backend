import { Test, TestingModule } from '@nestjs/testing';
import { ShopCheckoutService, describeLine } from './shop-checkout.service';
import { ShopPricingService } from './shop-pricing.service';
import { OrderReferenceService } from './order-reference.service';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma.service';

/** Formes minimales des appels inspectes, pour eviter le `any` des mocks Jest. */
interface CreatedOrderArgs {
  data: {
    status: string;
    subtotalCents: number;
    totalCents: number;
    items: { create: unknown[] };
  };
}
interface StripeSessionArgs {
  lines: { unitAmountCents: number; quantity: number }[];
}

const firstCallArg = <T>(mock: jest.Mock): T => {
  const calls = mock.mock.calls as unknown as T[][];
  return calls[0][0];
};

const PRICED_CART = {
  lines: [
    {
      productId: 1,
      productName: 'Maillot 2026 — DVG × Joker',
      size: 'M',
      flockingText: 'Snake',
      quantity: 2,
      unitPriceCents: 4990,
      flockingFeeCents: 500,
      lineTotalCents: 10980,
    },
  ],
  subtotalCents: 10980,
  shippingCents: 590,
  totalCents: 11570,
  currency: 'eur',
};

describe('ShopCheckoutService', () => {
  let service: ShopCheckoutService;

  const mockPrisma = {
    order: { create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  };
  const mockPricing = { priceCart: jest.fn() };
  const mockReference = { generate: jest.fn() };
  const mockStripe = { createCheckoutSession: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPricing.priceCart.mockResolvedValue(PRICED_CART);
    mockReference.generate.mockResolvedValue('DVG-2026-0001');
    mockPrisma.order.create.mockResolvedValue({ id: 42, reference: 'DVG-2026-0001' });
    mockStripe.createCheckoutSession.mockResolvedValue({
      id: 'cs_1',
      url: 'https://stripe/cs_1',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopCheckoutService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShopPricingService, useValue: mockPricing },
        { provide: OrderReferenceService, useValue: mockReference },
        { provide: StripeService, useValue: mockStripe },
      ],
    }).compile();
    service = module.get(ShopCheckoutService);
  });

  const dto = { items: [{ productId: 1, size: 'M', quantity: 2, flockingText: 'Snake' }] };

  it("retourne l'URL de paiement renvoyée par Stripe", async () => {
    await expect(service.createCheckout(dto)).resolves.toEqual({ url: 'https://stripe/cs_1' });
  });

  it('persiste la commande en PENDING avec ses lignes avant d’appeler Stripe', async () => {
    await service.createCheckout(dto);

    // Les metadonnees Stripe ne peuvent pas porter un panier : les lignes
    // doivent exister en base avant la redirection.
    const { data: created } = firstCallArg<CreatedOrderArgs>(mockPrisma.order.create);
    expect(created.status).toBe('PENDING');
    expect(created.subtotalCents).toBe(10980);
    expect(created.totalCents).toBe(11570);
    expect(created.items.create).toEqual([
      expect.objectContaining({ productName: 'Maillot 2026 — DVG × Joker', flockingText: 'Snake' }),
    ]);
  });

  it('ne transmet que l’identifiant de commande en métadonnées', async () => {
    await service.createCheckout(dto);

    expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        shippingCents: 590,

        metadata: { orderId: '42', orderReference: 'DVG-2026-0001' },
      }),
    );
  });

  it('facture le flocage dans le montant unitaire envoyé à Stripe', async () => {
    await service.createCheckout(dto);

    const { lines } = firstCallArg<StripeSessionArgs>(mockStripe.createCheckoutSession);
    expect(lines[0].unitAmountCents).toBe(4990 + 500);
    expect(lines[0].quantity).toBe(2);
  });

  it('renseigne l’identifiant de session Stripe une fois la session créée', async () => {
    await service.createCheckout(dto);

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { stripeSessionId: 'cs_1' },
    });
  });

  it('supprime la commande PENDING si Stripe est injoignable', async () => {
    mockStripe.createCheckoutSession.mockRejectedValue(new Error('stripe down'));
    mockPrisma.order.delete.mockResolvedValue({});

    await expect(service.createCheckout(dto)).rejects.toThrow('stripe down');
    expect(mockPrisma.order.delete).toHaveBeenCalledWith({ where: { id: 42 } });
  });

  it('remonte l’erreur Stripe même si le nettoyage échoue', async () => {
    mockStripe.createCheckoutSession.mockRejectedValue(new Error('stripe down'));
    mockPrisma.order.delete.mockRejectedValue(new Error('db down'));

    // L'echec du nettoyage ne doit pas masquer la cause reelle.
    await expect(service.createCheckout(dto)).rejects.toThrow('stripe down');
  });

  it('ne crée aucune commande si la tarification échoue', async () => {
    mockPricing.priceCart.mockRejectedValue(new Error('panier invalide'));

    await expect(service.createCheckout(dto)).rejects.toThrow('panier invalide');
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(mockStripe.createCheckoutSession).not.toHaveBeenCalled();
  });
});

describe('describeLine', () => {
  it('mentionne le flocage pour que le client le relise avant de payer', () => {
    expect(describeLine({ productName: 'Maillot', size: 'L', flockingText: 'Snake' })).toBe(
      'Maillot — taille L — flocage « Snake »',
    );
  });

  it('n’ajoute rien en l’absence de flocage', () => {
    expect(describeLine({ productName: 'Maillot', size: 'L', flockingText: null })).toBe(
      'Maillot — taille L',
    );
  });
});
