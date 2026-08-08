import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShopDiscountService } from './shop-discount.service';
import { PrismaService } from '../prisma.service';

const MAINTENANT = new Date('2026-08-08T12:00:00Z');

/** Le code effectivement ecrit en base, sans passer par un matcher non type. */
const writtenCode = (mock: jest.Mock): string => {
  const [args] = mock.mock.calls[0] as [{ data: { code: string } }];
  return args.data.code;
};

/** Code de reference : 5 € de reduction, sans borne. */
const CODE = {
  id: 7,
  code: 'BIENVENUE',
  type: 'FIXED' as const,
  value: 500,
  minSubtotalCents: null,
  startsAt: null,
  endsAt: null,
  maxUses: null,
  usedCount: 0,
  active: true,
};

describe('ShopDiscountService', () => {
  let service: ShopDiscountService;

  const mockPrisma = {
    shopDiscountCode: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    order: { count: jest.fn(), groupBy: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.order.count.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShopDiscountService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(ShopDiscountService);
  });

  describe('resolveForCart', () => {
    it('applique un code valide et rend le montant déduit', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue(CODE);

      await expect(service.resolveForCart('bienvenue', 4990, MAINTENANT)).resolves.toEqual({
        id: 7,
        code: 'BIENVENUE',
        amountCents: 500,
      });
    });

    it('cherche le code sous sa forme normalisée', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue(CODE);

      await service.resolveForCart('  bienvenue ', 4990, MAINTENANT);

      expect(mockPrisma.shopDiscountCode.findUnique).toHaveBeenCalledWith({
        where: { code: 'BIENVENUE' },
      });
    });

    it('refuse un code inconnu', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue(null);

      await expect(service.resolveForCart('INCONNU', 4990, MAINTENANT)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuse un code désactivé sans dire qu’il existe', async () => {
      // Distinguer « inconnu » de « desactive » indiquerait a qui balaie
      // l'endpoint quels codes existent.
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue({ ...CODE, active: false });

      await expect(service.resolveForCart('BIENVENUE', 4990, MAINTENANT)).rejects.toThrow(
        'Ce code de réduction est invalide',
      );
    });

    it('refuse un code expiré', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue({
        ...CODE,
        endsAt: new Date('2026-08-01'),
      });

      await expect(service.resolveForCart('BIENVENUE', 4990, MAINTENANT)).rejects.toThrow(
        "Ce code de réduction n'est pas valable actuellement",
      );
    });

    it('refuse un panier sous le minimum, en annonçant le seuil', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue({
        ...CODE,
        minSubtotalCents: 5000,
      });

      await expect(service.resolveForCart('BIENVENUE', 4990, MAINTENANT)).rejects.toThrow(
        "Ce code s'applique à partir de 50,00 € d'achat",
      );
    });

    it('refuse un code dont le quota est consommé', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue({
        ...CODE,
        maxUses: 1,
        usedCount: 1,
      });

      await expect(service.resolveForCart('BIENVENUE', 4990, MAINTENANT)).rejects.toThrow(
        "Ce code de réduction n'est plus disponible",
      );
    });

    it('refuse un code à usage unique déjà engagé dans une session ouverte', async () => {
      // Le coeur de la reservation : sans elle, deux clients qui paient a
      // quelques secondes d'intervalle obtiennent tous deux la remise, et
      // refuser le second est impossible — il a deja paye.
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue({ ...CODE, maxUses: 1 });
      mockPrisma.order.count.mockResolvedValue(1);

      await expect(service.resolveForCart('BIENVENUE', 4990, MAINTENANT)).rejects.toThrow(
        "Ce code de réduction n'est plus disponible",
      );
    });

    it('ne compte comme réservation que les sessions encore vivantes', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue({ ...CODE, maxUses: 5 });

      await service.resolveForCart('BIENVENUE', 4990, MAINTENANT);

      // La borne est l'echeance de la session, pas l'age de la commande : les
      // PENDING abandonnees vivent plusieurs jours avant d'etre purgees.
      expect(mockPrisma.order.count).toHaveBeenCalledWith({
        where: { discountCodeId: 7, status: 'PENDING', sessionExpiresAt: { gt: MAINTENANT } },
      });
    });

    it('ne compte aucune réservation quand le code est illimité', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue(CODE);

      await service.resolveForCart('BIENVENUE', 4990, MAINTENANT);

      expect(mockPrisma.order.count).not.toHaveBeenCalled();
    });

    it('refuse un code qui ne retire rien du panier', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue({
        ...CODE,
        type: 'PERCENTAGE',
        value: 1,
      });

      // 1 % de 0,10 € arrondi vers le bas fait zero : annoncer une reduction
      // qui ne reduit rien serait pire que la refuser.
      await expect(service.resolveForCart('BIENVENUE', 10, MAINTENANT)).rejects.toThrow(
        "Ce code ne s'applique pas à ce panier",
      );
    });
  });

  describe('consume', () => {
    it('incrémente le compteur en une seule instruction', async () => {
      // Deux webhooks traites en parallele ne doivent pas lire la meme valeur
      // avant de l'ecrire.
      mockPrisma.shopDiscountCode.update.mockResolvedValue({ ...CODE, usedCount: 1 });

      await service.consume(7);

      expect(mockPrisma.shopDiscountCode.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { usedCount: { increment: 1 } },
      });
    });

    it('n’échoue pas quand le quota est dépassé', async () => {
      // Le client a paye : lui refuser sa commande apres coup serait pire que
      // d'accorder une utilisation de trop.
      mockPrisma.shopDiscountCode.update.mockResolvedValue({
        ...CODE,
        maxUses: 1,
        usedCount: 2,
      });

      await expect(service.consume(7)).resolves.toBeUndefined();
    });
  });

  describe('administration', () => {
    it('normalise le code à la création', async () => {
      mockPrisma.shopDiscountCode.create.mockResolvedValue(CODE);

      await service.createForAdmin({ code: 'bienvenue', type: 'FIXED', value: 500 });

      expect(writtenCode(mockPrisma.shopDiscountCode.create)).toBe('BIENVENUE');
    });

    it('refuse un pourcentage au-delà de 100 %', async () => {
      await expect(
        service.createForAdmin({ code: 'TROP', type: 'PERCENTAGE', value: 120 }),
      ).rejects.toThrow('Une remise en pourcentage ne peut pas dépasser 100 %');
    });

    it('refuse une fenêtre inversée', async () => {
      await expect(
        service.createForAdmin({
          code: 'INVERSE',
          type: 'FIXED',
          value: 500,
          startsAt: '2026-09-01T00:00:00Z',
          endsAt: '2026-08-01T00:00:00Z',
        }),
      ).rejects.toThrow('La date de fin doit être postérieure à la date de début');
    });

    it('traduit une collision de code en refus lisible', async () => {
      mockPrisma.shopDiscountCode.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.createForAdmin({ code: 'BIENVENUE', type: 'FIXED', value: 500 }),
      ).rejects.toThrow('Le code « BIENVENUE » existe déjà');
    });

    it('laisse modifier les conditions d’un code déjà utilisé', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue({ ...CODE, usedCount: 3 });
      mockPrisma.shopDiscountCode.update.mockResolvedValue({ ...CODE, value: 800 });

      await expect(service.updateForAdmin(7, { value: 800 })).resolves.toBeDefined();
    });

    it('refuse de renommer un code déjà utilisé', async () => {
      // La commande garde le libelle, pas une reference : renommer rendrait ses
      // ventes passees irrattachables a l'operation.
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue({ ...CODE, usedCount: 3 });

      await expect(service.updateForAdmin(7, { code: 'AUTRE' })).rejects.toThrow(
        'ses conditions restent modifiables, pas son libellé',
      );
    });

    it('accepte de renommer un code jamais utilisé', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue(CODE);
      mockPrisma.shopDiscountCode.update.mockResolvedValue({ ...CODE, code: 'AUTRE' });

      await expect(service.updateForAdmin(7, { code: 'autre' })).resolves.toBeDefined();
      expect(writtenCode(mockPrisma.shopDiscountCode.update)).toBe('AUTRE');
    });

    it('refuse de supprimer un code déjà utilisé', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue({ ...CODE, usedCount: 1 });

      await expect(service.removeForAdmin(7)).rejects.toThrow('désactivez-le');
      expect(mockPrisma.shopDiscountCode.delete).not.toHaveBeenCalled();
    });

    it('supprime un code jamais utilisé', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue(CODE);

      await service.removeForAdmin(7);

      expect(mockPrisma.shopDiscountCode.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    });

    it('signale un code introuvable', async () => {
      mockPrisma.shopDiscountCode.findUnique.mockResolvedValue(null);

      await expect(service.removeForAdmin(404)).rejects.toThrow(NotFoundException);
    });

    it('ne propose jamais un code déjà pris', async () => {
      mockPrisma.shopDiscountCode.findUnique
        .mockResolvedValueOnce(CODE)
        .mockResolvedValueOnce(null);

      const { code } = await service.suggestCode();

      expect(mockPrisma.shopDiscountCode.findUnique).toHaveBeenCalledTimes(2);
      expect(code).toHaveLength(8);
    });

    it('compte les réservations en une seule requête groupée', async () => {
      mockPrisma.shopDiscountCode.findMany.mockResolvedValue([CODE, { ...CODE, id: 8 }]);
      mockPrisma.order.groupBy.mockResolvedValue([{ discountCodeId: 7, _count: { _all: 2 } }]);

      const codes = await service.findAllForAdmin(MAINTENANT);

      expect(mockPrisma.order.groupBy).toHaveBeenCalledTimes(1);
      expect(codes[0].reservedCount).toBe(2);
      expect(codes[1].reservedCount).toBe(0);
    });
  });
});
