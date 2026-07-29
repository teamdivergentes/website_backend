import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { BadRequestException } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../common/constants/permissions';

describe('MatchesController', () => {
  let controller: MatchesController;

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
      controllers: [MatchesController],
      providers: [{ provide: MatchesService, useValue: mockService }, PermissionsGuard, Reflector],
    }).compile();
    controller = module.get<MatchesController>(MatchesController);
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  // ─── findAllPublic ───────────────────────────────────────────────────────────

  describe('findAllPublic', () => {
    it('transmet teamId, status et limit parsés', async () => {
      mockService.findAllPublic.mockResolvedValue([]);
      await controller.findAllPublic('2', 'upcoming', '10');
      expect(mockService.findAllPublic).toHaveBeenCalledWith({
        teamId: 2,
        status: 'upcoming',
        limit: 10,
      });
    });

    it('sans query → filtres vides', async () => {
      mockService.findAllPublic.mockResolvedValue([]);
      await controller.findAllPublic(undefined, undefined, undefined);
      expect(mockService.findAllPublic).toHaveBeenCalledWith({});
    });

    it('teamId non numérique → lève BadRequestException', () => {
      expect(() => controller.findAllPublic('abc', undefined, undefined)).toThrow(
        BadRequestException,
      );
    });

    it('limit non numérique → lève BadRequestException', () => {
      expect(() => controller.findAllPublic(undefined, undefined, 'abc')).toThrow(
        BadRequestException,
      );
    });

    it('limit négatif → lève BadRequestException', () => {
      expect(() => controller.findAllPublic(undefined, undefined, '-1')).toThrow(
        BadRequestException,
      );
    });

    it('status invalide → lève BadRequestException', () => {
      expect(() => controller.findAllPublic(undefined, 'invalid', undefined)).toThrow(
        BadRequestException,
      );
    });

    it('status=past accepté', async () => {
      mockService.findAllPublic.mockResolvedValue([]);
      await controller.findAllPublic(undefined, 'past', undefined);
      expect(mockService.findAllPublic).toHaveBeenCalledWith({ status: 'past' });
    });
  });

  // ─── PermissionsGuard metadata ───────────────────────────────────────────────

  describe('PermissionsGuard metadata', () => {
    const getPerms = (methodName: keyof typeof MatchesController.prototype): string[] => {
      // Passe par le descripteur plutot que par un acces direct : on ne veut que
      // les metadonnees posees par le decorateur, jamais appeler la methode.
      const fn = Object.getOwnPropertyDescriptor(MatchesController.prototype, methodName)
        ?.value as object;
      return Reflect.getMetadata('permissions', fn) as string[];
    };

    it('findAllAdmin exige matches:read', () => {
      expect(getPerms('findAllAdmin')).toContain(PERMISSIONS.MATCHES_READ);
    });

    it('create exige matches:write', () => {
      expect(getPerms('create')).toContain(PERMISSIONS.MATCHES_WRITE);
    });

    it('update exige matches:write', () => {
      expect(getPerms('update')).toContain(PERMISSIONS.MATCHES_WRITE);
    });

    it('remove exige matches:delete', () => {
      expect(getPerms('remove')).toContain(PERMISSIONS.MATCHES_DELETE);
    });
  });
});
