import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { BadRequestException } from '@nestjs/common';
import { TrophiesController } from './trophies.controller';
import { TrophiesService } from './trophies.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../common/constants/permissions';

describe('TrophiesController', () => {
  let controller: TrophiesController;

  const mockService = {
    findAllPublic: jest.fn(),
    findAllAdmin: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrophiesController],
      providers: [{ provide: TrophiesService, useValue: mockService }, PermissionsGuard, Reflector],
    }).compile();
    controller = module.get<TrophiesController>(TrophiesController);
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  // ─── Routes publiques ────────────────────────────────────────────────────────

  describe('findAllPublic', () => {
    it('transmet featured et teamId parsés', async () => {
      mockService.findAllPublic.mockResolvedValue([]);
      await controller.findAllPublic('true', '2');
      expect(mockService.findAllPublic).toHaveBeenCalledWith({ featured: true, teamId: 2 });
    });

    it('sans query → filtres vides', async () => {
      mockService.findAllPublic.mockResolvedValue([]);
      await controller.findAllPublic(undefined, undefined);
      expect(mockService.findAllPublic).toHaveBeenCalledWith({});
    });

    it('featured=false → filtre featured: false', async () => {
      mockService.findAllPublic.mockResolvedValue([]);
      await controller.findAllPublic('false', undefined);
      expect(mockService.findAllPublic).toHaveBeenCalledWith({ featured: false });
    });

    it('teamId non numérique → lève BadRequestException', () => {
      expect(() => controller.findAllPublic(undefined, 'abc')).toThrow(BadRequestException);
    });
  });

  // ─── PermissionsGuard metadata ───────────────────────────────────────────────

  describe('PermissionsGuard metadata', () => {
    const getPerms = (methodName: keyof typeof TrophiesController.prototype): string[] => {
      // Passe par le descripteur plutot que par un acces direct : on ne veut que
      // les metadonnees posees par le decorateur, jamais appeler la methode.
      const fn = Object.getOwnPropertyDescriptor(TrophiesController.prototype, methodName)
        ?.value as object;
      return Reflect.getMetadata('permissions', fn) as string[];
    };

    it('les routes write exigent trophies:write (create)', () => {
      expect(getPerms('create')).toContain(PERMISSIONS.TROPHIES_WRITE);
    });

    it('les routes write exigent trophies:write (update)', () => {
      expect(getPerms('update')).toContain(PERMISSIONS.TROPHIES_WRITE);
    });

    it('la route delete exige trophies:delete', () => {
      expect(getPerms('remove')).toContain(PERMISSIONS.TROPHIES_DELETE);
    });

    it('la route findAllAdmin exige trophies:read', () => {
      expect(getPerms('findAllAdmin')).toContain(PERMISSIONS.TROPHIES_READ);
    });
  });
});
