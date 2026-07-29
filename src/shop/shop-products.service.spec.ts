import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShopProductsService } from './shop-products.service';
import { ShopSettingsService } from './shop-settings.service';
import { PrismaService } from '../prisma.service';

const JOKER = {
  id: 1,
  slug: 'maillot-2026-joker',
  name: 'Maillot 2026 — DVG × Joker',
  shortDescription: null,
  description: 'Polyester européen',
  priceCents: 4990,
  imageFront: 'assets/img/shop/joker-front.png',
  imageBack: 'assets/img/shop/joker-back.png',
  imageCard: null,
  allowFlocking: true,
  flockingFeeCents: 500,
  flockingTopPct: 32,
  flockingLeftPct: 50,
  sizes: [{ label: 'M' }, { label: 'L' }],
};

describe('ShopProductsService', () => {
  let service: ShopProductsService;

  const mockPrisma = {
    shopProduct: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const mockSettings = { get: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockSettings.get.mockResolvedValue({
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
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShopSettingsService, useValue: mockSettings },
      ],
    }).compile();
    service = module.get(ShopProductsService);
  });

  describe('findPublicCatalog', () => {
    it('joint les frais de port au catalogue pour éviter un second aller-retour', async () => {
      mockPrisma.shopProduct.findMany.mockResolvedValue([JOKER]);

      const catalog = await service.findPublicCatalog();

      expect(catalog.shippingStandardCents).toBe(500);
      expect(catalog.shippingExpressCents).toBe(1000);
      expect(catalog.freeShippingThresholdCents).toBe(12000);
      expect(catalog.products).toHaveLength(1);
      expect(catalog.products[0].sizes).toEqual(['M', 'L']);
    });

    it('ne retourne que les produits actifs', async () => {
      mockPrisma.shopProduct.findMany.mockResolvedValue([]);

      await service.findPublicCatalog();

      expect(mockPrisma.shopProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true } }),
      );
    });

    it('ne divulgue ni catalogue ni prix quand la boutique est fermée', async () => {
      mockSettings.get.mockResolvedValue({
        shopEnabled: false,
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
      });

      const catalog = await service.findPublicCatalog();

      expect(catalog.products).toEqual([]);
      expect(catalog.shopEnabled).toBe(false);
      expect(mockPrisma.shopProduct.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findPublicBySlug', () => {
    it('retourne le produit actif correspondant', async () => {
      mockPrisma.shopProduct.findFirst.mockResolvedValue(JOKER);

      const product = await service.findPublicBySlug('maillot-2026-joker');

      expect(product.slug).toBe('maillot-2026-joker');
      expect(product.flockingFeeCents).toBe(500);
    });

    it('lève NotFoundException pour un produit inactif ou inconnu', async () => {
      mockPrisma.shopProduct.findFirst.mockResolvedValue(null);

      await expect(service.findPublicBySlug('inconnu')).rejects.toThrow(NotFoundException);
    });

    it('reste muet quand la boutique est fermée', async () => {
      mockSettings.get.mockResolvedValue({ shopEnabled: false });

      await expect(service.findPublicBySlug('maillot-2026-joker')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.shopProduct.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('normalise les tailles en majuscules et dédoublonne', async () => {
      mockPrisma.shopProduct.create.mockResolvedValue(JOKER);

      await service.create({
        slug: 'maillot-test',
        name: 'Test',
        priceCents: 4990,
        sizes: [' m ', 'M', 'l'],
      });

      const calls = mockPrisma.shopProduct.create.mock.calls as unknown as {
        data: { sizes: { create: { label: string; position: number }[] } };
      }[][];
      const { sizes } = calls[0][0].data;
      expect(sizes.create).toEqual([
        { label: 'M', position: 0 },
        { label: 'L', position: 1 },
      ]);
    });

    it('rejette un slug déjà utilisé', async () => {
      mockPrisma.shopProduct.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.create({ slug: 'existant', name: 'Test', priceCents: 100, sizes: ['M'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette un produit dont aucune taille n’est exploitable', async () => {
      await expect(
        service.create({ slug: 'vide', name: 'Test', priceCents: 100, sizes: ['  ', ''] }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
