import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

const buildContext = (user?: unknown, requiredRoles?: string[]): ExecutionContext => {
  const mockRequest = { user };
  const handler = jest.fn();
  const classRef = jest.fn();
  return {
    getHandler: () => handler,
    getClass: () => classRef,
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as unknown as ExecutionContext;
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(guard).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // canActivate
  // ---------------------------------------------------------------------------
  describe('canActivate', () => {
    it("devrait retourner true si aucun @Roles() n'est défini", () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = buildContext({ id: 1, email: 'test@test.fr', role: { name: 'Admin' } });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("devrait lever ForbiddenException si l'utilisateur est absent de la requête", () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const context = buildContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('devrait retourner true si le rôle correspond (case-insensitive)', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const user = { id: 1, email: 'a@a.fr', role: { name: 'Admin' } };
      const context = buildContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("devrait retourner true si l'un des rôles multiples correspond", () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'gestionnaire']);
      const user = { id: 1, email: 'a@a.fr', role: { name: 'Gestionnaire' } };
      const context = buildContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('devrait lever ForbiddenException si le rôle est insuffisant', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const user = { id: 1, email: 'b@b.fr', role: { name: 'CM' } };
      const context = buildContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('devrait comparer les rôles sans distinction de casse (ADMIN vs admin)', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      const user = { id: 1, email: 'a@a.fr', role: { name: 'admin' } };
      const context = buildContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('devrait vérifier le metadata via la clé ROLES_KEY', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = buildContext({ id: 1, email: 'a@a.fr', role: { name: 'Admin' } });

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
    });
  });
});
