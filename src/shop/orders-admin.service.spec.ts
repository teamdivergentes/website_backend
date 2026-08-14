import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ORDER_COUNTER_WINDOW_DAYS, OrdersAdminService } from './orders-admin.service';
import { ShopNotifierService } from './shop-notifier.service';
import { PrismaService } from '../prisma.service';

describe('OrdersAdminService', () => {
  let service: OrdersAdminService;

  const mockPrisma = {
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockNotifier = { notifyStatusChange: jest.fn() };

  const pendingOrder = {
    id: 1,
    reference: 'DVG-2026-0042',
    items: [
      {
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
      providers: [
        OrdersAdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShopNotifierService, useValue: mockNotifier },
      ],
    }).compile();
    service = module.get<OrdersAdminService>(OrdersAdminService);
    // Statut d'avant par defaut, sinon `update` leve NotFoundException avant
    // meme d'ecrire : la relecture precede desormais la mise a jour.
    mockPrisma.order.findUnique.mockResolvedValue({ status: 'PAID' });
    mockNotifier.notifyStatusChange.mockResolvedValue(false);
  });

  describe('findAll', () => {
    it('trie par date décroissante et ne filtre pas si aucun statut', async () => {
      mockPrisma.order.findMany.mockResolvedValue([pendingOrder]);

      await service.findAll();

      // Les PENDING sont des sessions de paiement abandonnees, pas des commandes.
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { status: { not: 'PENDING' } },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filtre par statut quand il est fourni', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.findAll('SHIPPED');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'SHIPPED' },
        include: { items: true },
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
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('produit un récapitulatif contenant référence, produit, taille et adresse', async () => {
      mockPrisma.order.findMany.mockResolvedValue([pendingOrder]);

      const batch = await service.getPendingBatch();

      expect(batch.count).toBe(1);
      expect(batch.recapText).toContain('DVG-2026-0042');
      expect(batch.recapText).toContain('Maillot 2026 — DVG × Joker');
      expect(batch.recapText).toContain('Snake');
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

    it('produit une ligne CSV par article, pas par commande', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          ...pendingOrder,
          items: [
            { productName: 'Maillot', size: 'M', flockingText: 'A', quantity: 1 },
            { productName: 'Maillot', size: 'L', flockingText: null, quantity: 2 },
          ],
        },
      ]);

      const batch = await service.getPendingBatch();

      // 1 en-tete + 2 articles : c'est ce que le fabricant doit produire.
      expect(batch.csv.trim().split('\n')).toHaveLength(3);
    });

    it('neutralise l’injection de formule dans le CSV', async () => {
      // Le flocage autorise le tiret : un tableur interprete `-1+1` comme une
      // formule, y compris apres avoir retire les guillemets.
      mockPrisma.order.findMany.mockResolvedValue([
        {
          ...pendingOrder,
          items: [{ productName: 'Maillot', size: 'M', flockingText: '-1-1', quantity: 1 }],
        },
      ]);

      const batch = await service.getPendingBatch();

      expect(batch.csv).toContain(`"'-1-1"`);
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
        include: { items: true },
        data: { trackingNumber: 'AB123' },
      });
    });

    it('lève NotFoundException si la commande est introuvable (P2025)', async () => {
      mockPrisma.order.update.mockRejectedValue({ code: 'P2025' });

      await expect(service.update(999, { status: 'SHIPPED' })).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException sans écrire si la commande a disparu avant la relecture', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { status: 'SHIPPED' })).rejects.toThrow(NotFoundException);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('transmet au notifier le statut lu AVANT écriture, pas celui d’arrivée', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ status: 'PAID' });
      const shipped = { ...pendingOrder, status: 'SHIPPED' };
      mockPrisma.order.update.mockResolvedValue(shipped);

      await service.update(1, { status: 'SHIPPED' });

      expect(mockNotifier.notifyStatusChange).toHaveBeenCalledWith(shipped, 'PAID');
    });

    it('n’échoue pas quand le mail au client échoue', async () => {
      mockPrisma.order.update.mockResolvedValue({ ...pendingOrder, status: 'SHIPPED' });
      mockNotifier.notifyStatusChange.mockRejectedValue(new Error('SMTP indisponible'));

      // Un serveur SMTP en panne ne doit pas empecher un operateur de faire
      // avancer une commande : la mise a jour est deja actee en base.
      await expect(service.update(1, { status: 'SHIPPED' })).resolves.toMatchObject({
        status: 'SHIPPED',
      });
    });
  });

  describe('getCounters', () => {
    it('exclut les PENDING des deux chiffres et borne la fenêtre glissante', async () => {
      mockPrisma.order.count.mockResolvedValueOnce(24).mockResolvedValueOnce(7);
      const now = new Date('2026-08-07T12:00:00Z');

      const counters = await service.getCounters(now);

      expect(counters).toEqual({ total: 24, lastThirtyDays: 7, windowDays: 30 });
      expect(mockPrisma.order.count).toHaveBeenNthCalledWith(1, {
        where: { status: { not: 'PENDING' } },
      });
      expect(mockPrisma.order.count).toHaveBeenNthCalledWith(2, {
        where: {
          status: { not: 'PENDING' },
          createdAt: {
            gte: new Date(now.getTime() - ORDER_COUNTER_WINDOW_DAYS * 24 * 60 * 60 * 1000),
          },
        },
      });
    });

    it('retourne zéro sur une boutique sans commande', async () => {
      mockPrisma.order.count.mockResolvedValue(0);

      // Zero s'affiche : masquer le bloc le rendrait indistinguable d'une panne,
      // et c'est au lancement qu'on regarde ce chiffre.
      await expect(service.getCounters()).resolves.toMatchObject({ total: 0, lastThirtyDays: 0 });
    });
  });
});
