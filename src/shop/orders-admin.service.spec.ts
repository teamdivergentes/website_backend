import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersAdminService } from './orders-admin.service';
import { PrismaService } from '../prisma.service';

describe('OrdersAdminService', () => {
  let service: OrdersAdminService;

  const mockPrisma = {
    order: { findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  };

  const pendingOrder = {
    id: 1,
    reference: 'DVG-2026-0042',
    productName: 'MAILLOT 2023',
    size: 'M',
    quantity: 2,
    unitPriceCents: 3990,
    shippingCents: 400,
    totalCents: 8380,
    customerEmail: 'client@example.com',
    customerName: 'Jean Dupont',
    shippingAddress: {
      address: { line1: '1 rue du Test', postal_code: '75001', city: 'Paris', country: 'FR' },
    },
    status: 'PAID',
    createdAt: new Date('2026-07-20T10:00:00Z'),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersAdminService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<OrdersAdminService>(OrdersAdminService);
  });

  describe('findAll', () => {
    it('trie par date décroissante et ne filtre pas si aucun statut', async () => {
      mockPrisma.order.findMany.mockResolvedValue([pendingOrder]);

      await service.findAll();

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filtre par statut quand il est fourni', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.findAll('SHIPPED');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'SHIPPED' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getPendingBatch', () => {
    it('ne sélectionne que les commandes au statut PAID', async () => {
      mockPrisma.order.findMany.mockResolvedValue([pendingOrder]);

      await service.getPendingBatch();

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'PAID' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('produit un récapitulatif contenant référence, produit, taille et adresse', async () => {
      mockPrisma.order.findMany.mockResolvedValue([pendingOrder]);

      const batch = await service.getPendingBatch();

      expect(batch.count).toBe(1);
      expect(batch.recapText).toContain('DVG-2026-0042');
      expect(batch.recapText).toContain('MAILLOT 2023');
      expect(batch.recapText).toContain('M');
      expect(batch.recapText).toContain('1 rue du Test');
    });

    it('produit un CSV avec une ligne d’en-tête et une ligne par commande', async () => {
      mockPrisma.order.findMany.mockResolvedValue([pendingOrder]);

      const batch = await service.getPendingBatch();
      const lines = batch.csv.trim().split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('reference');
      expect(lines[1]).toContain('DVG-2026-0042');
    });

    it('échappe les guillemets dans le CSV', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { ...pendingOrder, customerName: 'Jean "Le Grand" Dupont' },
      ]);

      const batch = await service.getPendingBatch();

      expect(batch.csv).toContain('Jean ""Le Grand"" Dupont');
    });

    it('retourne un lot vide sans erreur', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const batch = await service.getPendingBatch();

      expect(batch.count).toBe(0);
      expect(batch.orders).toEqual([]);
    });
  });

  describe('markSent', () => {
    it('bascule les commandes PAID en SENT_TO_MERCHANT avec un batchId commun', async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markSent();

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { status: 'PAID' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          status: 'SENT_TO_MERCHANT',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          merchantBatchId: expect.any(String),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          sentToMerchantAt: expect.any(Date),
        }),
      });
      expect(result.count).toBe(3);
      expect(result.batchId).toBeTruthy();
    });

    it('lève BadRequestException si aucune commande n’est en attente', async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.markSent()).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('ne transmet que les champs fournis', async () => {
      mockPrisma.order.update.mockResolvedValue(pendingOrder);

      await service.update(1, { trackingNumber: 'AB123' });

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { trackingNumber: 'AB123' },
      });
    });

    it('lève NotFoundException si la commande est introuvable (P2025)', async () => {
      mockPrisma.order.update.mockRejectedValue({ code: 'P2025' });

      await expect(service.update(999, { status: 'SHIPPED' })).rejects.toThrow(NotFoundException);
    });
  });
});
