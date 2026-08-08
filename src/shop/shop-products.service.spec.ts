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
  allowFlocking: true,
  flockingFeeCents: 500,
  flockingTopPct: 32,
  flockingLeftPct: 50,
  sizes: [{ label: 'M' }, { label: 'L' }],
  images: [
    { url: 'assets/img/shop/joker-front.webp', label: 'face', isBack: false, isCard: false },
    { url: 'assets/img/shop/joker-back.webp', label: 'dos', isBack: true, isCard: false },
    { url: 'assets/img/shop/joker-porte.jpg', label: 'porté', isBack: false, isCard: true },
  ],
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
      freeShippingThresholdCents: 12000,
      costProductionCents: 1600,
      costPartnerCents: 700,
      costPartnerEnabled: false,
      costEcommerceCents: 300,
      costFlockingCents: 0,
      costShippingStandardCents: 900,
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
        freeShippingThresholdCents: 12000,
        costProductionCents: 1600,
        costPartnerCents: 700,
        costPartnerEnabled: false,
        costEcommerceCents: 300,
        costFlockingCents: 0,
        costShippingStandardCents: 900,
        currency: 'eur',
      });

      const catalog = await service.findPublicCatalog();

      expect(catalog.products).toEqual([]);
      expect(catalog.shopEnabled).toBe(false);
      expect(mockPrisma.shopProduct.findMany).not.toHaveBeenCalled();
    });
  });

  describe('prix promotionnel en vitrine', () => {
    const EN_PROMO = {
      ...JOKER,
      promoPriceCents: 3990,
      promoStartsAt: new Date('2020-01-01'),
      promoEndsAt: new Date('2999-12-31'),
    };

    it('affiche le prix promotionnel comme prix à payer', async () => {
      // `priceCents` reste le montant du : le front qui l'affichait deja montre
      // le bon prix, et son calcul de panier reste d'accord avec le serveur.
      mockPrisma.shopProduct.findMany.mockResolvedValue([EN_PROMO]);

      const catalog = await service.findPublicCatalog();

      expect(catalog.products[0].priceCents).toBe(3990);
      expect(catalog.products[0].listPriceCents).toBe(4990);
    });

    it('n’expose aucun prix barré hors promotion', async () => {
      // `null` plutot qu'un montant egal : le front n'a pas a comparer deux
      // nombres pour savoir s'il doit en barrer un.
      mockPrisma.shopProduct.findMany.mockResolvedValue([JOKER]);

      const catalog = await service.findPublicCatalog();

      expect(catalog.products[0].listPriceCents).toBeNull();
    });

    it('retire la promotion d’elle-même une fois la fenêtre passée', async () => {
      mockPrisma.shopProduct.findMany.mockResolvedValue([
        { ...EN_PROMO, promoEndsAt: new Date('2020-06-30') },
      ]);

      const catalog = await service.findPublicCatalog();

      expect(catalog.products[0].priceCents).toBe(4990);
      expect(catalog.products[0].listPriceCents).toBeNull();
    });

    it('évalue tout le catalogue au même instant', async () => {
      // Deux promotions qui s'achevent a la meme seconde ne doivent pas sortir
      // l'une active et l'autre echue dans la meme reponse.
      mockPrisma.shopProduct.findMany.mockResolvedValue([EN_PROMO, { ...EN_PROMO, id: 2 }]);

      const catalog = await service.findPublicCatalog();

      expect(catalog.products.map((p) => p.priceCents)).toEqual([3990, 3990]);
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

  describe('galerie de visuels', () => {
    /** Les visuels tels que le service les a préparés pour Prisma. */
    async function createdImages(images: { url: string; label: string; isCard?: boolean }[]) {
      mockPrisma.shopProduct.create.mockResolvedValue(JOKER);
      await service.create({
        slug: 'maillot-test',
        name: 'Test',
        priceCents: 4990,
        sizes: ['M'],
        images,
      });

      const calls = mockPrisma.shopProduct.create.mock.calls as unknown as {
        data: {
          images: {
            create: { url: string; label: string; position: number; isCard: boolean }[];
          };
        };
      }[][];
      return calls[0][0].data.images.create;
    }

    it('numérote les positions dans l’ordre reçu', async () => {
      const created = await createdImages([
        { url: 'a.webp', label: 'face' },
        { url: 'b.webp', label: 'dos' },
        { url: 'c.jpg', label: 'porté' },
      ]);

      expect(created.map((image) => image.position)).toEqual([0, 1, 2]);
      expect(created.map((image) => image.label)).toEqual(['face', 'dos', 'porté']);
    });

    it('écarte les doublons d’adresse plutôt que de les empiler', async () => {
      const created = await createdImages([
        { url: 'a.webp', label: 'face' },
        { url: ' a.webp ', label: 'face bis' },
      ]);

      expect(created).toHaveLength(1);
    });

    it('retient la vue d’ouverture comme vignette quand aucune n’est désignée', async () => {
      const created = await createdImages([
        { url: 'a.webp', label: 'face' },
        { url: 'b.webp', label: 'dos' },
      ]);

      expect(created.map((image) => image.isCard)).toEqual([true, false]);
    });

    it('respecte la vignette désignée', async () => {
      const created = await createdImages([
        { url: 'a.webp', label: 'face' },
        { url: 'b.jpg', label: 'porté', isCard: true },
      ]);

      expect(created.map((image) => image.isCard)).toEqual([false, true]);
    });

    it('tranche une double désignation au lieu de la rejeter', async () => {
      // Deux vignettes n'est pas une faute de saisie mais une ambiguïté : la
      // première l'emporte, et l'écran montre le résultat.
      const created = await createdImages([
        { url: 'a.webp', label: 'face', isCard: true },
        { url: 'b.jpg', label: 'porté', isCard: true },
      ]);

      expect(created.map((image) => image.isCard)).toEqual([true, false]);
    });

    it('expose la vignette et la galerie ordonnée au public', async () => {
      mockPrisma.shopProduct.findFirst.mockResolvedValue(JOKER);

      const product = await service.findPublicBySlug('maillot-2026-joker');

      expect(product.images.map((image) => image.label)).toEqual(['face', 'dos', 'porté']);
      expect(product.cardImage).toBe('assets/img/shop/joker-porte.jpg');
    });

    it('replie la vignette sur la première image quand aucune n’est marquée', async () => {
      mockPrisma.shopProduct.findFirst.mockResolvedValue({
        ...JOKER,
        images: [{ url: 'a.webp', label: 'face', isBack: false, isCard: false }],
      });

      const product = await service.findPublicBySlug('maillot-2026-joker');

      expect(product.cardImage).toBe('a.webp');
    });

    it('rend une vignette nulle sur un produit sans visuel, sans lever d’erreur', async () => {
      mockPrisma.shopProduct.findFirst.mockResolvedValue({ ...JOKER, images: [] });

      const product = await service.findPublicBySlug('maillot-2026-joker');

      expect(product.cardImage).toBeNull();
      expect(product.images).toEqual([]);
    });
  });
});
