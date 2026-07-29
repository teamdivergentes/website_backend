import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ShopPricingService } from './shop-pricing.service';
import { ShopSettingsService } from './shop-settings.service';
import { PrismaService } from '../prisma.service';

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
  shippingExpressCents: 1000,
  freeShippingThresholdCents: 12000,
  costProductionCents: 1600,
  costPartnerCents: 700,
  costPartnerEnabled: false,
  costEcommerceCents: 300,
  costFlockingCents: 0,
  costShippingStandardCents: 900,
  costShippingExpressCents: 1200,
  currency: 'eur',
};

describe('ShopPricingService', () => {
  let service: ShopPricingService;

  const mockPrisma = { shopProduct: { findMany: jest.fn() } };
  const mockSettings = { get: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockSettings.get.mockResolvedValue(REGLAGES);
    mockPrisma.shopProduct.findMany.mockResolvedValue([JOKER, SANS_FLOCAGE]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopPricingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShopSettingsService, useValue: mockSettings },
      ],
    }).compile();
    service = module.get(ShopPricingService);
  });

  describe('invariant : le prix ne vient jamais du client', () => {
    it('ignore un prix injecté dans la requête et retient celui de la base', async () => {
      const cart = await service.priceCart([
        // Un client hostile ajoute des champs de montant dans son panier.
        { productId: 1, size: 'M', quantity: 1, priceCents: 1, flockingFeeCents: 0 },
      ] as never);

      expect(cart.lines[0].unitPriceCents).toBe(4990);
      expect(cart.subtotalCents).toBe(4990);
      expect(cart.totalCents).toBe(4990 + 500);
    });

    it('lit les frais de port depuis les réglages, pas depuis le panier', async () => {
      mockSettings.get.mockResolvedValue(REGLAGES);

      const cart = await service.priceCart([{ productId: 1, size: 'M', quantity: 1 }], 'EXPRESS');

      expect(cart.shippingCents).toBe(1000);
    });
  });

  describe('flocage', () => {
    it('facture le surcoût quand un flocage est demandé', async () => {
      const cart = await service.priceCart([
        { productId: 1, size: 'M', quantity: 2, flockingText: 'Snake' },
      ]);

      expect(cart.lines[0].flockingFeeCents).toBe(500);
      expect(cart.lines[0].lineTotalCents).toBe((4990 + 500) * 2);
    });

    it('ne facture rien quand aucun flocage n’est demandé', async () => {
      const cart = await service.priceCart([{ productId: 1, size: 'M', quantity: 1 }]);

      expect(cart.lines[0].flockingText).toBeNull();
      expect(cart.lines[0].flockingFeeCents).toBe(0);
      expect(cart.lines[0].lineTotalCents).toBe(4990);
    });

    it('traite un flocage vide ou blanc comme une absence de flocage', async () => {
      const cart = await service.priceCart([
        { productId: 1, size: 'M', quantity: 1, flockingText: '   ' },
      ]);

      expect(cart.lines[0].flockingText).toBeNull();
      expect(cart.lines[0].flockingFeeCents).toBe(0);
    });

    it('normalise les espaces internes', async () => {
      const cart = await service.priceCart([
        { productId: 1, size: 'M', quantity: 1, flockingText: '  Le    Snake  ' },
      ]);

      expect(cart.lines[0].flockingText).toBe('Le Snake');
    });

    it('rejette un flocage sur un produit qui ne l’autorise pas', async () => {
      await expect(
        service.priceCart([{ productId: 2, size: 'M', quantity: 1, flockingText: 'Snake' }]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette un flocage trop long', async () => {
      await expect(
        service.priceCart([
          { productId: 1, size: 'M', quantity: 1, flockingText: 'TropLongPourUnDos' },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it.each(['<script>', 'a;b', 'a=b', 'a+b', 'Ëmoji', 'a@b'])(
      'rejette le flocage hostile %p',
      async (flockingText) => {
        await expect(
          service.priceCart([{ productId: 1, size: 'M', quantity: 1, flockingText }]),
        ).rejects.toThrow(BadRequestException);
      },
    );
  });

  describe('validation du panier', () => {
    it('rejette un panier vide', async () => {
      await expect(service.priceCart([])).rejects.toThrow(BadRequestException);
    });

    it('rejette un produit inconnu ou inactif', async () => {
      mockPrisma.shopProduct.findMany.mockResolvedValue([]);

      await expect(service.priceCart([{ productId: 99, size: 'M', quantity: 1 }])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejette une taille absente du produit', async () => {
      await expect(
        service.priceCart([{ productId: 1, size: 'XXXL', quantity: 1 }]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette un panier dépassant le plafond d’articles', async () => {
      await expect(
        service.priceCart([
          { productId: 1, size: 'M', quantity: 10 },
          { productId: 1, size: 'L', quantity: 10 },
          { productId: 2, size: 'M', quantity: 1 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse de tarifer quand la boutique est fermée', async () => {
      mockSettings.get.mockResolvedValue({ ...REGLAGES, shopEnabled: false });

      await expect(service.priceCart([{ productId: 1, size: 'M', quantity: 1 }])).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('frais de port', () => {
    it('ne compte les frais de port qu’une fois, quel que soit le nombre d’articles', async () => {
      // Franchise ecartee : ce test porte sur le comptage du colis, pas sur le
      // seuil de gratuite, qui a son propre cas plus bas.
      mockSettings.get.mockResolvedValue({ ...REGLAGES, freeShippingThresholdCents: 0 });

      const cart = await service.priceCart([
        { productId: 1, size: 'M', quantity: 3 },
        { productId: 2, size: 'M', quantity: 2 },
      ]);

      expect(cart.shippingCents).toBe(500);
      expect(cart.subtotalCents).toBe(4990 * 3 + 4990 * 2);
      expect(cart.totalCents).toBe(cart.subtotalCents + 500);
    });

    it('facture le mode rapide plus cher que le standard', async () => {
      mockSettings.get.mockResolvedValue({ ...REGLAGES, freeShippingThresholdCents: 0 });

      const cart = await service.priceCart([{ productId: 1, size: 'M', quantity: 1 }], 'EXPRESS');

      expect(cart.shippingCents).toBe(1000);
      expect(cart.shippingMethod).toBe('EXPRESS');
    });

    it('offre le port des que le panier atteint le seuil', async () => {
      // 4990 x 3 = 14 970, au-dela des 120 € de franchise.
      const cart = await service.priceCart([{ productId: 1, size: 'M', quantity: 3 }]);

      expect(cart.shippingCents).toBe(0);
      expect(cart.shippingIsFree).toBe(true);
      expect(cart.totalCents).toBe(cart.subtotalCents);
    });

    it('fige les couts du moment pour que la marge ne bouge plus ensuite', async () => {
      const cart = await service.priceCart([{ productId: 1, size: 'M', quantity: 1 }]);

      // 16 € de production + 3 € ecommerce, partenaire inactif.
      expect(cart.unitCostCents).toBe(1900);
      expect(cart.shippingCostCents).toBe(900);
    });
  });
});
