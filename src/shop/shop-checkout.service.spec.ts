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
    discountCents: number;
    discountCode: string | null;
    discountCodeId: number | null;
    sessionExpiresAt: Date;
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
  discountCents: 0,
  shippingCents: 590,
  totalCents: 11570,
  currency: 'eur',
};

/** Le meme panier, avec un bon de reduction de 5 €. */
const PRICED_CART_REMISE = {
  ...PRICED_CART,
  discountCents: 500,
  discount: { id: 7, code: 'BIENVENUE', amountCents: 500 },
  totalCents: 11070,
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
    await expect(
      service.createCheckout(dto, { tier: 'PUBLIC', buyerUserId: null }),
    ).resolves.toEqual({ url: 'https://stripe/cs_1' });
  });

  it('persiste la commande en PENDING avec ses lignes avant d’appeler Stripe', async () => {
    await service.createCheckout(dto, { tier: 'PUBLIC', buyerUserId: null });

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

  describe('bon de réduction', () => {
    it('fige le montant déduit et le libellé du code sur la commande', async () => {
      mockPricing.priceCart.mockResolvedValue(PRICED_CART_REMISE);

      await service.createCheckout(
        { ...dto, discountCode: 'bienvenue' },
        { tier: 'PUBLIC', buyerUserId: null },
      );

      const { data: created } = firstCallArg<CreatedOrderArgs>(mockPrisma.order.create);
      // Le libelle est duplique volontairement : c'est lui qui rattachera la
      // vente a son operation si le code est renomme ou supprime.
      expect(created).toMatchObject({
        discountCents: 500,
        discountCode: 'BIENVENUE',
        discountCodeId: 7,
        totalCents: 11070,
      });
    });

    it('transmet la chaîne saisie au calcul, jamais un montant', async () => {
      await service.createCheckout(
        { ...dto, discountCode: 'bienvenue' },
        { tier: 'PUBLIC', buyerUserId: null },
      );

      expect(mockPricing.priceCart).toHaveBeenCalledWith(
        expect.objectContaining({ discountCode: 'bienvenue' }),
      );
    });

    it('réserve le code dès la création de la commande, avant l’appel à Stripe', async () => {
      // Une commande PENDING sans echeance ne reserve rien : l'ecrire au retour
      // de Stripe laisserait le code disponible pendant tout l'aller-retour.
      mockPricing.priceCart.mockResolvedValue(PRICED_CART_REMISE);

      await service.createCheckout(
        { ...dto, discountCode: 'BIENVENUE' },
        { tier: 'PUBLIC', buyerUserId: null },
      );

      const { data: created } = firstCallArg<CreatedOrderArgs>(mockPrisma.order.create);
      expect(created.sessionExpiresAt).toBeInstanceOf(Date);
      expect(created.sessionExpiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('donne à Stripe la même échéance que celle portée par la commande', async () => {
      mockPricing.priceCart.mockResolvedValue(PRICED_CART_REMISE);

      await service.createCheckout(
        { ...dto, discountCode: 'BIENVENUE' },
        { tier: 'PUBLIC', buyerUserId: null },
      );

      const { data: created } = firstCallArg<CreatedOrderArgs>(mockPrisma.order.create);
      expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          discountCents: 500,
          discountLabel: 'BIENVENUE',
          expiresAt: created.sessionExpiresAt,
        }),
      );
    });

    it('ne porte aucune remise quand le panier n’en a pas', async () => {
      await service.createCheckout(dto, { tier: 'PUBLIC', buyerUserId: null });

      const { data: created } = firstCallArg<CreatedOrderArgs>(mockPrisma.order.create);
      // Zero et non `null` : le reporting somme sans cas particulier.
      expect(created.discountCents).toBe(0);
      expect(created.discountCode).toBeNull();
      expect(created.discountCodeId).toBeNull();
    });
  });

  it('ne transmet que l’identifiant de commande en métadonnées', async () => {
    await service.createCheckout(dto, { tier: 'PUBLIC', buyerUserId: null });

    expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        shippingCents: 590,

        metadata: { orderId: '42', orderReference: 'DVG-2026-0001' },
      }),
    );
  });

  it('facture le flocage dans le montant unitaire envoyé à Stripe', async () => {
    await service.createCheckout(dto, { tier: 'PUBLIC', buyerUserId: null });

    const { lines } = firstCallArg<StripeSessionArgs>(mockStripe.createCheckoutSession);
    expect(lines[0].unitAmountCents).toBe(4990 + 500);
    expect(lines[0].quantity).toBe(2);
  });

  it('renseigne l’identifiant de session Stripe une fois la session créée', async () => {
    await service.createCheckout(dto, { tier: 'PUBLIC', buyerUserId: null });

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { stripeSessionId: 'cs_1' },
    });
  });

  it('supprime la commande PENDING si Stripe est injoignable', async () => {
    mockStripe.createCheckoutSession.mockRejectedValue(new Error('stripe down'));
    mockPrisma.order.delete.mockResolvedValue({});

    await expect(
      service.createCheckout(dto, { tier: 'PUBLIC', buyerUserId: null }),
    ).rejects.toThrow('stripe down');
    expect(mockPrisma.order.delete).toHaveBeenCalledWith({ where: { id: 42 } });
  });

  it('remonte l’erreur Stripe même si le nettoyage échoue', async () => {
    mockStripe.createCheckoutSession.mockRejectedValue(new Error('stripe down'));
    mockPrisma.order.delete.mockRejectedValue(new Error('db down'));

    // L'echec du nettoyage ne doit pas masquer la cause reelle.
    await expect(
      service.createCheckout(dto, { tier: 'PUBLIC', buyerUserId: null }),
    ).rejects.toThrow('stripe down');
  });

  it('ne crée aucune commande si la tarification échoue', async () => {
    mockPricing.priceCart.mockRejectedValue(new Error('panier invalide'));

    await expect(
      service.createCheckout(dto, { tier: 'PUBLIC', buyerUserId: null }),
    ).rejects.toThrow('panier invalide');
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
