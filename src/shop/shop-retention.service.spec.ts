import { Test, TestingModule } from '@nestjs/testing';
import { ShopRetentionService } from './shop-retention.service';
import { PrismaService } from '../prisma.service';
import { StripeService } from './stripe.service';

describe('ShopRetentionService', () => {
  let service: ShopRetentionService;

  const mockStripe = {
    getSessionOutcome: jest.fn(),
  };

  const mockPrisma = {
    order: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    orderItem: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    // Horloge figee : les dates de coupure (5 ans, 7 jours) doivent etre
    // deterministes pour verifier le contenu exact des requetes Prisma.
    jest.useFakeTimers().setSystemTime(new Date('2026-07-29T00:00:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopRetentionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripe },
      ],
    }).compile();
    service = module.get<ShopRetentionService>(ShopRetentionService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('anonymizeOldOrders', () => {
    it('anonymise les commandes de plus de 5 ans et efface le flocage de leurs lignes', async () => {
      mockPrisma.order.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.orderItem.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.anonymizeOldOrders();

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: new Date('2021-07-29T00:00:00.000Z') },
          status: { not: 'PENDING' },
          OR: [{ customerEmail: { not: '' } }, { customerName: { not: '' } }],
        },
        select: { id: true },
      });
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { customerEmail: '', customerName: '', shippingAddress: {} },
      });
      expect(mockPrisma.orderItem.updateMany).toHaveBeenCalledWith({
        where: { orderId: { in: [1, 2] }, flockingText: { not: null } },
        data: { flockingText: null },
      });
      expect(result).toEqual({ ordersAnonymized: 2, flockingTextsCleared: 3 });
    });

    it('ne touche a rien si aucune commande eligible (moins de 5 ans, ou deja anonymisee)', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.anonymizeOldOrders();

      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.orderItem.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ ordersAnonymized: 0, flockingTextsCleared: 0 });
    });

    it('exclut les commandes PENDING : elles sont purgees, pas anonymisees', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.anonymizeOldOrders();

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({ status: { not: 'PENDING' } }),
        }),
      );
    });

    it('est idempotente : une deuxieme execution ne retrouve plus rien a anonymiser', async () => {
      mockPrisma.order.findMany.mockResolvedValueOnce([{ id: 1 }]);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.orderItem.updateMany.mockResolvedValue({ count: 0 });

      const first = await service.anonymizeOldOrders();
      expect(first.ordersAnonymized).toBe(1);

      // Deuxieme execution : la commande est deja anonymisee, le filtre OR
      // sur customerEmail/customerName ne la retrouve donc plus.
      mockPrisma.order.findMany.mockResolvedValueOnce([]);
      const second = await service.anonymizeOldOrders();

      expect(second).toEqual({ ordersAnonymized: 0, flockingTextsCleared: 0 });
    });

    it('ne leve jamais d’exception : une erreur Prisma est journalisee et absorbee', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('DB indisponible'));

      const result = await service.anonymizeOldOrders();

      expect(result).toEqual({ ordersAnonymized: 0, flockingTextsCleared: 0 });
    });
  });

  describe('purgeAbandonedPendingOrders', () => {
    const candidate = (id: number, reference: string, stripeSessionId: string) => ({
      id,
      reference,
      stripeSessionId,
    });

    it('ne cherche que les PENDING passe le delai, et ne fait rien s’il n’y en a pas', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.purgeAbandonedPendingOrders();

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING', createdAt: { lt: new Date('2026-07-22T00:00:00.000Z') } },
        select: { id: true, reference: true, stripeSessionId: true },
      });
      expect(mockPrisma.order.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({ ordersDeleted: 0, ordersCancelled: 0, ordersKeptPaid: 0 });
    });

    it('ne supprime que les sessions dont Stripe confirme qu’elles n’ont pas abouti', async () => {
      mockPrisma.order.findMany.mockResolvedValue([candidate(1, 'DVG-2026-0001', 'cs_abandonnee')]);
      mockStripe.getSessionOutcome.mockResolvedValue('unpaid');
      mockPrisma.order.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.purgeAbandonedPendingOrders();

      expect(mockStripe.getSessionOutcome).toHaveBeenCalledWith('cs_abandonnee');
      expect(mockPrisma.order.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1] }, status: 'PENDING' },
      });
      expect(result.ordersDeleted).toBe(1);
    });

    /**
     * Le coeur du garde-fou : Stripe a encaisse, notre webhook n'a rien vu. La
     * commande porte le seul exemplaire du panier et du flocage, elle ne doit
     * ni disparaitre, ni etre annulee.
     */
    it('conserve intacte une commande payee chez Stripe dont le webhook s’est perdu', async () => {
      mockPrisma.order.findMany.mockResolvedValue([candidate(7, 'DVG-2026-0007', 'cs_payee')]);
      mockStripe.getSessionOutcome.mockResolvedValue('paid');
      mockPrisma.order.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.purgeAbandonedPendingOrders();

      expect(mockPrisma.order.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [] }, status: 'PENDING' },
      });
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [] }, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      expect(result).toEqual({ ordersDeleted: 0, ordersCancelled: 0, ordersKeptPaid: 1 });
    });

    it('annule sans supprimer quand Stripe ne repond pas', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        candidate(3, 'DVG-2026-0003', 'cs_injoignable'),
      ]);
      mockStripe.getSessionOutcome.mockResolvedValue('unknown');
      mockPrisma.order.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.purgeAbandonedPendingOrders();

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [3] }, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      expect(result).toEqual({ ordersDeleted: 0, ordersCancelled: 1, ordersKeptPaid: 0 });
    });

    it('n’interroge pas Stripe pour un identifiant de session reste provisoire', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        candidate(9, 'DVG-2026-0009', 'pending:DVG-2026-0009'),
      ]);
      mockPrisma.order.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.purgeAbandonedPendingOrders();

      expect(mockStripe.getSessionOutcome).not.toHaveBeenCalled();
      expect(result).toEqual({ ordersDeleted: 0, ordersCancelled: 1, ordersKeptPaid: 0 });
    });

    it('trie correctement un lot melangeant les trois verdicts', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        candidate(1, 'DVG-2026-0001', 'cs_1'),
        candidate(2, 'DVG-2026-0002', 'cs_2'),
        candidate(3, 'DVG-2026-0003', 'cs_3'),
      ]);
      mockStripe.getSessionOutcome
        .mockResolvedValueOnce('unpaid')
        .mockResolvedValueOnce('paid')
        .mockResolvedValueOnce('unknown');
      mockPrisma.order.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.purgeAbandonedPendingOrders();

      expect(mockPrisma.order.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1] }, status: 'PENDING' },
      });
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [3] }, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      expect(result).toEqual({ ordersDeleted: 1, ordersCancelled: 1, ordersKeptPaid: 1 });
    });

    it('est idempotente : plus aucun candidat au second passage', async () => {
      mockPrisma.order.findMany.mockResolvedValueOnce([candidate(1, 'DVG-2026-0001', 'cs_1')]);
      mockStripe.getSessionOutcome.mockResolvedValue('unpaid');
      mockPrisma.order.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
      expect((await service.purgeAbandonedPendingOrders()).ordersDeleted).toBe(1);

      mockPrisma.order.findMany.mockResolvedValueOnce([]);
      expect((await service.purgeAbandonedPendingOrders()).ordersDeleted).toBe(0);
    });

    it('ne leve jamais d’exception : une erreur Prisma est journalisee et absorbee', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('DB indisponible'));

      const result = await service.purgeAbandonedPendingOrders();

      expect(result).toEqual({ ordersDeleted: 0, ordersCancelled: 0, ordersKeptPaid: 0 });
    });
  });

  describe('runDailyRetentionJob', () => {
    it('enchaine la purge des paniers abandonnes puis l’anonymisation', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.runDailyRetentionJob();

      // Un appel pour les PENDING, un pour les commandes a anonymiser.
      expect(mockPrisma.order.findMany).toHaveBeenCalledTimes(2);
    });

    it('ne casse jamais le scheduler, meme si une etape leve une exception imprevue', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('boom'));

      await expect(service.runDailyRetentionJob()).resolves.toBeUndefined();
    });
  });
});
