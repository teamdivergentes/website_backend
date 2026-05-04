import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
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
    const buildContext = (): ExecutionContext => {
      const handler = jest.fn();
      const classRef = jest.fn();
      return {
        getHandler: () => handler,
        getClass: () => classRef,
        switchToHttp: jest.fn(),
      } as unknown as ExecutionContext;
    };

    it('devrait retourner true directement pour un endpoint @Public()', () => {
      const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const context = buildContext();
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
    });

    it('devrait déléguer à super.canActivate() pour un endpoint protégé', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      // Spy sur la méthode parente — on vérifie que super est invoqué

      const parentClass = Object.getPrototypeOf(JwtAuthGuard) as typeof JwtAuthGuard;
      const superActivate = jest.spyOn(parentClass.prototype, 'canActivate').mockReturnValue(true);

      const context = buildContext();
      void guard.canActivate(context);

      expect(superActivate).toHaveBeenCalledWith(context);

      superActivate.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // handleRequest
  // ---------------------------------------------------------------------------
  describe('handleRequest', () => {
    it("devrait retourner l'utilisateur si tout est valide", () => {
      const user = { id: 1, email: 'admin@teamdivergentes.fr' };

      const result = guard.handleRequest(null, user, null);

      expect(result).toBe(user);
    });

    it("devrait relancer l'erreur fournie si err est non nul", () => {
      const err = new Error('Token expiré');

      expect(() => guard.handleRequest(err, null, null)).toThrow('Token expiré');
    });

    it('devrait lever UnauthorizedException si user est falsy et err est null', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
    });

    it('devrait lever UnauthorizedException si user est false et err est null', () => {
      expect(() => guard.handleRequest(null, false, null)).toThrow(UnauthorizedException);
    });
  });
});
