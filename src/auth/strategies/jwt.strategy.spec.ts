import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockRole = {
    id: 1,
    name: 'Admin',
    permissions: ['users:read'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isSystem: true,
  };

  const mockUser = {
    id: 1,
    email: 'admin@example.com',
    password: 'hashedpassword',
    roleId: 1,
    actif: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: mockRole,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // validate — payload JWT valide
  // -------------------------------------------------------------------------
  describe('validate', () => {
    it("devrait retourner l'utilisateur sans mot de passe si payload valide", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate({ sub: 1, email: 'admin@example.com' });

      expect(result).toBeDefined();
      expect(result.email).toBe('admin@example.com');
      expect(result).not.toHaveProperty('password');
    });

    it('devrait lancer UnauthorizedException si user non trouvé', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate({ sub: 999, email: 'unknown@example.com' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait lancer UnauthorizedException si user inactif', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, actif: false });

      await expect(strategy.validate({ sub: 1, email: 'admin@example.com' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // extractJwt — support cookie + Bearer header
  // -------------------------------------------------------------------------
  describe('extractJwt', () => {
    it('devrait extraire le token depuis le cookie dvg_auth_token en priorité', () => {
      const mockRequest = {
        cookies: { dvg_auth_token: 'cookie-token' },
        headers: { authorization: 'Bearer header-token' },
      };

      // Accéder à la fonction d'extraction exposée par la stratégie
      const extracted = (
        strategy as unknown as { extractJwt: (req: unknown) => string | null }
      ).extractJwt(mockRequest);
      expect(extracted).toBe('cookie-token');
    });

    it('devrait utiliser le Bearer header si le cookie est absent', () => {
      const mockRequest = {
        cookies: {},
        headers: { authorization: 'Bearer header-token' },
      };

      const extracted = (
        strategy as unknown as { extractJwt: (req: unknown) => string | null }
      ).extractJwt(mockRequest);
      expect(extracted).toBe('header-token');
    });

    it('devrait retourner null si ni cookie ni header', () => {
      const mockRequest = {
        cookies: {},
        headers: {},
      };

      const extracted = (
        strategy as unknown as { extractJwt: (req: unknown) => string | null }
      ).extractJwt(mockRequest);
      expect(extracted).toBeNull();
    });
  });
});
