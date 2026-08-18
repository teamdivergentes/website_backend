import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { OrdersAdminController } from './orders-admin.controller';
import { OrdersAdminService } from './orders-admin.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../common/constants/permissions';

describe('OrdersAdminController', () => {
  let controller: OrdersAdminController;

  const mockService = {
    findAll: jest.fn(),
    getPendingBatch: jest.fn(),
    getCounters: jest.fn(),
    markSent: jest.fn(),
    update: jest.fn(),
    refund: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersAdminController],
      providers: [
        { provide: OrdersAdminService, useValue: mockService },
        PermissionsGuard,
        Reflector,
      ],
    }).compile();
    controller = module.get<OrdersAdminController>(OrdersAdminController);
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('PermissionsGuard metadata', () => {
    const getPerms = (methodName: keyof typeof OrdersAdminController.prototype): string[] => {
      // Passe par le descripteur plutot que par un acces direct : on ne veut que
      // les metadonnees posees par le decorateur, jamais appeler la methode.
      const fn = Object.getOwnPropertyDescriptor(OrdersAdminController.prototype, methodName)
        ?.value as object;
      return Reflect.getMetadata('permissions', fn) as string[];
    };

    it('la liste exige commandes:read', () => {
      expect(getPerms('findAll')).toContain(PERMISSIONS.COMMANDES_READ);
    });

    it('le lot en attente exige commandes:read', () => {
      expect(getPerms('getPendingBatch')).toContain(PERMISSIONS.COMMANDES_READ);
    });

    it('le marquage comme transmis exige commandes:write', () => {
      expect(getPerms('markSent')).toContain(PERMISSIONS.COMMANDES_WRITE);
    });

    it('la mise à jour exige commandes:write', () => {
      expect(getPerms('update')).toContain(PERMISSIONS.COMMANDES_WRITE);
    });

    it('le remboursement exige commandes:write', () => {
      expect(getPerms('refund')).toContain(PERMISSIONS.COMMANDES_WRITE);
    });

    // Les compteurs alimentent le dashboard et la page Statistiques : c'est une
    // lecture, elle ne doit jamais exiger le droit d'ecriture.
    it('les compteurs exigent commandes:read', () => {
      expect(getPerms('getCounters')).toContain(PERMISSIONS.COMMANDES_READ);
    });
  });

  describe('findAll', () => {
    it('transmet le filtre de statut au service', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll('SHIPPED');
      expect(mockService.findAll).toHaveBeenCalledWith('SHIPPED');
    });
  });

  describe('getCounters', () => {
    it('délègue au service', async () => {
      mockService.getCounters.mockResolvedValue({ total: 24, lastThirtyDays: 7, windowDays: 30 });
      await expect(controller.getCounters()).resolves.toEqual({
        total: 24,
        lastThirtyDays: 7,
        windowDays: 30,
      });
    });
  });

  describe('refund', () => {
    it('délègue au service avec l’identifiant de commande', async () => {
      const refunded = { id: 1, status: 'REFUNDED' };
      mockService.refund.mockResolvedValue(refunded);

      await expect(controller.refund(1)).resolves.toBe(refunded);
      expect(mockService.refund).toHaveBeenCalledWith(1);
    });
  });
});
