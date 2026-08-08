import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ShopPricingService } from './shop-pricing.service';
import { ShopSettingsService } from './shop-settings.service';
import { PrismaService } from '../prisma.service';
import { ShopDiscountService } from './shop-discount.service';

/** Maillot Joker : 49,90 € + 5 € de flocage. */
const JOKER = {
  id: 1,
  name: 'Maillot 2026 — DVG × Joker',
  priceCents: 4990,
  allowFlocking: true,
  flockingFeeCents: 500,
  sizes: [{ label: 'M' }, { label: 'L' }],
};

/** Produit sans flocage possible. */
const SANS_FLOCAGE = {
  id: 2,
  name: 'Maillot 2026 — Team Divergentes',
  priceCents: 4990,
  allowFlocking: false,
  flockingFeeCents: 0,
  sizes: [{ label: 'M' }],
};

/** Grille 2026 : port 5 € / 10 €, offert des 120 €, couts hors partenaire. */
const REGLAGES = {
  shopEnabled: true,
  shippingStandardCents: 500,
  freeShippingThresholdCents: 12000,
  costProductionCents: 1600,
  costPartnerCents: 700,
  costPartnerEnabled: false,
  costEcommerceCents: 300,
  costFlockingCents: 0,
  costShippingStandardCents: 900,
  currency: 'eur',
};

describe('ShopPricingService', () => {
  let service: ShopPricingService;

  const mockPrisma = { shopProduct: { findMany: jest.fn() } };
  const mockSettings = { get: jest.fn() };
  const mockDiscounts = { resolveForCart: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockSettings.get.mockResolvedValue(REGLAGES);
    mockPrisma.shopProduct.findMany.mockResolvedValue([JOKER, SANS_FLOCAGE]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopPricingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShopSettingsService, useValue: mockSettings },
        { provide: ShopDiscountService, useValue: mockDiscounts },
      ],
    }).compile();
    service = module.get(ShopPricingService);
  });

  describe('invariant : le prix ne vient jamais du client', () => {
    it('ignore un prix injecté dans la requête et retient celui de la base', async () => {
      const cart = await service.priceCart({
        // Un client hostile ajoute des champs de montant dans son panier.
        items: [
          { productId: 1, size: 'M', quantity: 1, priceCents: 1, flockingFeeCents: 0 },
        ] as never,
        // Et un bareme, tant qu'a faire. Il est ignore : celui qui compte est
        // l'argument, decide par l'appelant depuis l'identite authentifiee.
        tier: 'PUBLIC',
      });

      expect(cart.lines[0].unitPriceCents).toBe(4990);
      expect(cart.subtotalCents).toBe(4990);
      expect(cart.totalCents).toBe(4990 + 500);
    });

    it('lit les frais de port depuis les réglages, pas depuis le panier', async () => {
      mockSettings.get.mockResolvedValue(REGLAGES);

      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'PUBLIC',
      });

      expect(cart.shippingCents).toBe(500);
    });
  });

  describe('tarif reserve', () => {
    // Reglages de reference : production 1600, e-commerce 300, partenaire 700
    // desactive, flocage 0, colis reel 900 / 1200.

    it('facture le cout reel de la piece, pas le prix catalogue', async () => {
      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'RETAIL',
      });

      // 1600 de production seul : la commission partenaire est desactivee, et
      // les frais de traitement ne sont plus imputes a la piece.
      expect(cart.lines[0].unitPriceCents).toBe(1600);
      expect(cart.subtotalCents).toBe(1600);
    });

    it('ajoute la commission partenaire quand elle est active', async () => {
      mockSettings.get.mockResolvedValue({ ...REGLAGES, costPartnerEnabled: true });

      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'RETAIL',
      });

      expect(cart.lines[0].unitPriceCents).toBe(2300);
    });

    it('facture le cout reel du colis, pas le tarif client', async () => {
      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'RETAIL',
      });

      // 900, le cout reel du colis — et non 500, son tarif public.
      expect(cart.shippingCents).toBe(900);
    });

    it('n’applique jamais la franchise de port', async () => {
      // Offrir le port par-dessus un prix deja sans marge reviendrait a vendre
      // sous le cout. Trois pieces suffisent a franchir le seuil au tarif
      // public, jamais au tarif reserve — mais la regle ne doit pas dependre
      // d'un accident de calcul.
      mockSettings.get.mockResolvedValue({ ...REGLAGES, freeShippingThresholdCents: 1 });

      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'RETAIL',
      });

      expect(cart.shippingCents).toBe(900);
      expect(cart.shippingIsFree).toBe(false);
    });

    it('fige ce que la commande aurait coute au prix catalogue', async () => {
      // Sans ce montant, l'ecart entre prix public et prix paye devient
      // irreconstituable : le catalogue est modifiable a chaud.
      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'RETAIL',
      });

      expect(cart.publicTotalCents).toBe(4990 + 500);
      expect(cart.totalCents).toBe(1900 + 900);
      expect(cart.tier).toBe('RETAIL');
    });

    it('laisse le total public egal au total paye sur une vente ordinaire', async () => {
      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'PUBLIC',
      });

      expect(cart.publicTotalCents).toBe(cart.totalCents);
      expect(cart.tier).toBe('PUBLIC');
    });

    it('plafonne le panier bien plus bas qu’au tarif public', async () => {
      await expect(
        service.priceCart({
          items: [{ productId: 1, size: 'M', quantity: 4 }],
          tier: 'RETAIL',
        }),
      ).rejects.toThrow();
    });

    it('refuse un tarif mal configure plutot que d’encaisser zero', async () => {
      // Tous les couts a zero : le total tombe sous le minimum Stripe, qui
      // repondrait `no_payment_required`. La commande serait gratuite.
      mockSettings.get.mockResolvedValue({
        ...REGLAGES,
        costProductionCents: 0,
        costEcommerceCents: 0,
        costPartnerEnabled: false,
        costShippingStandardCents: 0,
      });

      await expect(
        service.priceCart({
          items: [{ productId: 1, size: 'M', quantity: 1 }],
          tier: 'RETAIL',
        }),
      ).rejects.toThrow();
    });
  });

  describe('flocage', () => {
    it('facture le surcoût quand un flocage est demandé', async () => {
      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 2, flockingText: 'Snake' }],
        tier: 'PUBLIC',
      });

      expect(cart.lines[0].flockingFeeCents).toBe(500);
      expect(cart.lines[0].lineTotalCents).toBe((4990 + 500) * 2);
    });

    it('ne facture rien quand aucun flocage n’est demandé', async () => {
      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'PUBLIC',
      });

      expect(cart.lines[0].flockingText).toBeNull();
      expect(cart.lines[0].flockingFeeCents).toBe(0);
      expect(cart.lines[0].lineTotalCents).toBe(4990);
    });

    it('traite un flocage vide ou blanc comme une absence de flocage', async () => {
      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1, flockingText: '   ' }],
        tier: 'PUBLIC',
      });

      expect(cart.lines[0].flockingText).toBeNull();
      expect(cart.lines[0].flockingFeeCents).toBe(0);
    });

    it('normalise les espaces internes', async () => {
      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1, flockingText: '  Le    Snake  ' }],
        tier: 'PUBLIC',
      });

      expect(cart.lines[0].flockingText).toBe('Le Snake');
    });

    it('rejette un flocage sur un produit qui ne l’autorise pas', async () => {
      await expect(
        service.priceCart({
          items: [{ productId: 2, size: 'M', quantity: 1, flockingText: 'Snake' }],
          tier: 'PUBLIC',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette un flocage trop long', async () => {
      await expect(
        service.priceCart({
          items: [{ productId: 1, size: 'M', quantity: 1, flockingText: 'TropLongPourUnDos' }],
          tier: 'PUBLIC',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it.each(['<script>', 'a;b', 'a=b', 'a+b', 'Ëmoji', 'a@b'])(
      'rejette le flocage hostile %p',
      async (flockingText) => {
        await expect(
          service.priceCart({
            items: [{ productId: 1, size: 'M', quantity: 1, flockingText }],
            tier: 'PUBLIC',
          }),
        ).rejects.toThrow(BadRequestException);
      },
    );
  });

  describe('validation du panier', () => {
    it('rejette un panier vide', async () => {
      await expect(service.priceCart({ items: [], tier: 'PUBLIC' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejette un produit inconnu ou inactif', async () => {
      mockPrisma.shopProduct.findMany.mockResolvedValue([]);

      await expect(
        service.priceCart({
          items: [{ productId: 99, size: 'M', quantity: 1 }],
          tier: 'PUBLIC',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette une taille absente du produit', async () => {
      await expect(
        service.priceCart({
          items: [{ productId: 1, size: 'XXXL', quantity: 1 }],
          tier: 'PUBLIC',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette un panier dépassant le plafond d’articles', async () => {
      await expect(
        service.priceCart({
          items: [
            { productId: 1, size: 'M', quantity: 10 },
            { productId: 1, size: 'L', quantity: 10 },
            { productId: 2, size: 'M', quantity: 1 },
          ],
          tier: 'PUBLIC',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse de tarifer quand la boutique est fermée', async () => {
      mockSettings.get.mockResolvedValue({ ...REGLAGES, shopEnabled: false });

      await expect(
        service.priceCart({
          items: [{ productId: 1, size: 'M', quantity: 1 }],
          tier: 'PUBLIC',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('frais de port', () => {
    it('ne compte les frais de port qu’une fois, quel que soit le nombre d’articles', async () => {
      // Franchise ecartee : ce test porte sur le comptage du colis, pas sur le
      // seuil de gratuite, qui a son propre cas plus bas.
      mockSettings.get.mockResolvedValue({ ...REGLAGES, freeShippingThresholdCents: 0 });

      const cart = await service.priceCart({
        items: [
          { productId: 1, size: 'M', quantity: 3 },
          { productId: 2, size: 'M', quantity: 2 },
        ],
        tier: 'PUBLIC',
      });

      expect(cart.shippingCents).toBe(500);
      expect(cart.subtotalCents).toBe(4990 * 3 + 4990 * 2);
      expect(cart.totalCents).toBe(cart.subtotalCents + 500);
    });

    /**
     * L'option rapide a ete retiree : elle annoncait un acheminement en 2 a 3
     * jours qu'aucun tarif fournisseur ne garantissait. Le panier ne peut plus
     * porter qu'un seul mode, et rien de ce que le client envoie ne doit
     * pouvoir en produire un autre.
     */
    it('n’expedie plus qu’en standard, quel que soit le panier', async () => {
      mockSettings.get.mockResolvedValue({ ...REGLAGES, freeShippingThresholdCents: 0 });

      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'PUBLIC',
      });

      expect(cart.shippingCents).toBe(500);
      expect(cart.shippingMethod).toBe('STANDARD');
    });

    it('offre le port des que le panier atteint le seuil', async () => {
      // 4990 x 3 = 14 970, au-dela des 120 € de franchise.
      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 3 }],
        tier: 'PUBLIC',
      });

      expect(cart.shippingCents).toBe(0);
      expect(cart.shippingIsFree).toBe(true);
      expect(cart.totalCents).toBe(cart.subtotalCents);
    });

    it('fige les couts du moment pour que la marge ne bouge plus ensuite', async () => {
      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'PUBLIC',
      });

      // 16 € de production, partenaire inactif. Les 3 € de traitement sont
      // desormais portes a part : ils sont dus par commande, pas par piece.
      expect(cart.unitCostCents).toBe(1600);
      expect(cart.shippingCostCents).toBe(900);
      expect(cart.orderFeeCents).toBe(300);
    });
  });

  describe('bons de réduction', () => {
    it('déduit la remise du total sans toucher au sous-total', async () => {
      mockDiscounts.resolveForCart.mockResolvedValue({
        id: 7,
        code: 'BIENVENUE',
        amountCents: 500,
      });

      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'PUBLIC',
        discountCode: 'BIENVENUE',
      });

      expect(cart.subtotalCents).toBe(4990);
      expect(cart.discountCents).toBe(500);
      // 49,90 - 5,00 + 5,00 de port.
      expect(cart.totalCents).toBe(4990 - 500 + 500);
      expect(cart.discount).toEqual({ id: 7, code: 'BIENVENUE', amountCents: 500 });
    });

    it('transmet la chaîne saisie et le sous-total, jamais un montant du client', async () => {
      mockDiscounts.resolveForCart.mockResolvedValue({ id: 7, code: 'X', amountCents: 100 });

      await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1, discountCents: 9999 }] as never,
        tier: 'PUBLIC',
        discountCode: 'bienvenue',
      });

      expect(mockDiscounts.resolveForCart).toHaveBeenCalledWith(
        'bienvenue',
        4990,
        expect.any(Date),
      );
    });

    it('ne résout aucun code quand le panier n’en porte pas', async () => {
      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'PUBLIC',
      });

      expect(mockDiscounts.resolveForCart).not.toHaveBeenCalled();
      expect(cart.discountCents).toBe(0);
      expect(cart.discount).toBeUndefined();
    });

    it('refuse un bon de réduction par-dessus le tarif réservé', async () => {
      // La marge y est nulle par construction : toute remise vend sous le cout.
      await expect(
        service.priceCart({
          items: [{ productId: 1, size: 'M', quantity: 1 }],
          tier: 'RETAIL',
          discountCode: 'BIENVENUE',
        }),
      ).rejects.toThrow("Un bon de réduction ne s'applique pas au tarif réservé");
      expect(mockDiscounts.resolveForCart).not.toHaveBeenCalled();
    });

    it('évalue la franchise de port sur le sous-total avant remise', async () => {
      // 3 maillots = 149,70 €, au-dela des 120 € de franchise. Une remise de
      // 40 € ramene sous le seuil : si la franchise etait recalculee apres, le
      // client verrait le port reapparaitre a cause de sa reduction.
      mockDiscounts.resolveForCart.mockResolvedValue({
        id: 7,
        code: 'GROS',
        amountCents: 4000,
      });

      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 3 }],
        tier: 'PUBLIC',
        discountCode: 'GROS',
      });

      expect(cart.shippingCents).toBe(0);
      expect(cart.totalCents).toBe(14970 - 4000);
    });

    it('refuse un total ramené sous le minimum encaissable', async () => {
      // Un code a 100 % rouvre depuis le tunnel public le chemin que le
      // plancher fermait pour le tarif reserve : total a zero, Stripe repond
      // `no_payment_required` et la commande passe pour payee.
      mockDiscounts.resolveForCart.mockResolvedValue({
        id: 7,
        code: 'TOUT',
        amountCents: 4990,
      });
      mockSettings.get.mockResolvedValue({ ...REGLAGES, freeShippingThresholdCents: 1 });

      await expect(
        service.priceCart({
          items: [{ productId: 1, size: 'M', quantity: 1 }],
          tier: 'PUBLIC',
          discountCode: 'TOUT',
        }),
      ).rejects.toThrow('inférieur au minimum encaissable');
    });

    it('garde publicTotalCents égal au total sur une vente publique remisée', async () => {
      // Un bon de reduction est accessible a qui le detient : ce n'est pas un
      // tarif consenti a une personne, il ne doit pas gonfler l'avantage
      // attribue aux ventes a prix coutant.
      mockDiscounts.resolveForCart.mockResolvedValue({
        id: 7,
        code: 'BIENVENUE',
        amountCents: 500,
      });

      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'PUBLIC',
        discountCode: 'BIENVENUE',
      });

      expect(cart.publicTotalCents).toBe(cart.totalCents);
    });
  });

  describe('prix promotionnel', () => {
    const EN_PROMO = {
      ...JOKER,
      promoPriceCents: 3990,
      promoStartsAt: new Date('2026-08-01'),
      promoEndsAt: new Date('2026-08-31'),
    };

    it('facture le prix promotionnel sans que le client ait rien à saisir', async () => {
      mockPrisma.shopProduct.findMany.mockResolvedValue([EN_PROMO]);

      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'PUBLIC',
        now: new Date('2026-08-08T12:00:00Z'),
      });

      expect(cart.lines[0].unitPriceCents).toBe(3990);
      expect(cart.subtotalCents).toBe(3990);
    });

    it('expose le prix catalogue à barrer à côté du prix facturé', async () => {
      mockPrisma.shopProduct.findMany.mockResolvedValue([EN_PROMO]);

      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'PUBLIC',
        now: new Date('2026-08-08T12:00:00Z'),
      });

      expect(cart.lines[0].listUnitPriceCents).toBe(4990);
    });

    it('revient au prix catalogue une fois la fenêtre passée', async () => {
      mockPrisma.shopProduct.findMany.mockResolvedValue([EN_PROMO]);

      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
        tier: 'PUBLIC',
        now: new Date('2026-09-15T12:00:00Z'),
      });

      expect(cart.lines[0].unitPriceCents).toBe(4990);
    });

    it('ne réduit pas le surcoût de flocage', async () => {
      // Les deux montants restent distincts jusqu'au total de ligne.
      mockPrisma.shopProduct.findMany.mockResolvedValue([EN_PROMO]);

      const cart = await service.priceCart({
        items: [{ productId: 1, size: 'M', quantity: 1, flockingText: 'DVG' }],
        tier: 'PUBLIC',
        now: new Date('2026-08-08T12:00:00Z'),
      });

      expect(cart.lines[0].flockingFeeCents).toBe(500);
      expect(cart.lines[0].lineTotalCents).toBe(4490);
    });
  });
});
