import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: { getResume: jest.Mock; getTodo: jest.Mock };

  /** Requete portant l'utilisateur tel que le pose la strategie JWT. */
  function request(user: unknown): Request {
    return { user } as Request;
  }

  beforeEach(async () => {
    service = {
      getResume: jest.fn().mockResolvedValue({ drafts: [] }),
      getTodo: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: service }],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('transmet l’identité et les permissions au bloc Reprendre', async () => {
    await controller.getResume(request({ id: 7, role: { permissions: ['articles:read'] } }));

    expect(service.getResume).toHaveBeenCalledWith(7, ['articles:read']);
  });

  it('transmet les permissions au bloc À faire', async () => {
    await controller.getTodo(request({ id: 7, role: { permissions: ['matches:read'] } }));

    expect(service.getTodo).toHaveBeenCalledWith(['matches:read']);
  });

  it('traite un utilisateur sans rôle comme dépourvu de permission', async () => {
    await controller.getTodo(request({ id: 7 }));

    expect(service.getTodo).toHaveBeenCalledWith([]);
  });

  it('traite un rôle sans permissions comme une liste vide', async () => {
    await controller.getTodo(request({ id: 7, role: {} }));

    expect(service.getTodo).toHaveBeenCalledWith([]);
  });

  it('refuse une requête sans utilisateur', () => {
    // Ne devrait pas arriver, `JwtAuthGuard` etant global : le refus explicite
    // evite de servir le dashboard d'un `userId` indefini.
    expect(() => controller.getResume(request(undefined))).toThrow(ForbiddenException);
  });
});
