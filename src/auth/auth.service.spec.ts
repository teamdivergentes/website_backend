import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
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
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    loggerWarnSpy.mockRestore();
    loggerLogSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  describe('login', () => {
    it('devrait retourner access_token et user avec credentials valides', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.login({ email: 'admin@example.com', password: 'admin123' });

      expect(result.access_token).toBe('jwt-token');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.role.name).toBe(mockRole.name);
    });

    it('ne doit pas exposer le mot de passe dans la réponse', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.login({ email: 'admin@example.com', password: 'admin123' });

      expect(result.user).not.toHaveProperty('password');
    });

    it('devrait lancer UnauthorizedException si user non trouvé', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devrait lancer UnauthorizedException si compte inactif', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, actif: false });

      await expect(
        service.login({ email: 'admin@example.com', password: 'admin123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devrait lancer UnauthorizedException si mot de passe incorrect', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    // SEC-013 : journalisation des échecs et succès
    describe('SEC-013 — journalisation', () => {
      it('devrait logger warn avec raison "email inconnu" si email non trouvé (sans mot de passe)', async () => {
        mockUsersService.findByEmail.mockResolvedValue(null);

        await expect(
          service.login({ email: 'inconnu@example.com', password: 'WrongPass1' }),
        ).rejects.toThrow(UnauthorizedException);

        expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
        const calls = loggerWarnSpy.mock.calls as [string][];
        const message: string = calls[0][0];
        expect(message).toContain('inconnu@example.com');
        expect(message).toContain('email inconnu');
        expect(message.toLowerCase()).not.toContain('wrongpass1');
        expect(message.toLowerCase()).not.toContain('password');
      });

      it('devrait logger warn avec raison "mot de passe invalide" si mauvais mot de passe (sans le mot de passe)', async () => {
        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
          service.login({ email: 'admin@example.com', password: 'WrongPass1' }),
        ).rejects.toThrow(UnauthorizedException);

        expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
        const calls = loggerWarnSpy.mock.calls as [string][];
        const message: string = calls[0][0];
        expect(message).toContain('admin@example.com');
        expect(message).toContain('mot de passe invalide');
        expect(message.toLowerCase()).not.toContain('wrongpass1');
      });

      it('devrait logger warn avec raison "compte désactivé" si compte inactif (sans mot de passe)', async () => {
        mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, actif: false });

        await expect(
          service.login({ email: 'admin@example.com', password: 'WrongPass1' }),
        ).rejects.toThrow(UnauthorizedException);

        expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
        const calls = loggerWarnSpy.mock.calls as [string][];
        const message: string = calls[0][0];
        expect(message).toContain('admin@example.com');
        expect(message).toContain('compte désactivé');
        expect(message.toLowerCase()).not.toContain('wrongpass1');
      });

      it('devrait logger log (info) avec email et userId sur succès de connexion', async () => {
        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.signAsync.mockResolvedValue('jwt-token');

        await service.login({ email: 'admin@example.com', password: 'Password1' });

        expect(loggerLogSpy).toHaveBeenCalledTimes(1);
        const calls = loggerLogSpy.mock.calls as [string][];
        const message: string = calls[0][0];
        expect(message).toContain('admin@example.com');
        expect(message).toContain(String(mockUser.id));
      });
    });
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------
  describe('register', () => {
    it('devrait créer un utilisateur et retourner access_token', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpw');
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.register({
        email: 'new@example.com',
        password: 'newpassword',
        roleId: 1,
      });

      expect(result.access_token).toBe('jwt-token');
    });

    it('devrait lancer ConflictException si email déjà utilisé', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: 'admin@example.com', password: 'password' }),
      ).rejects.toThrow(ConflictException);
    });

    it('devrait lancer NotFoundException si rôle par défaut non trouvé', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(
        service.register({ email: 'new@example.com', password: 'newpassword' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // refresh
  // -------------------------------------------------------------------------
  describe('refresh', () => {
    it('devrait retourner un nouveau access_token pour un utilisateur actif', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('new-jwt-token');

      const result = await service.refresh(1);

      expect(result.access_token).toBe('new-jwt-token');
    });

    it('devrait signer avec sub et email dans le payload', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('new-jwt-token');

      await service.refresh(1);

      const [payload] = mockJwtService.signAsync.mock.calls[0] as [{ sub: number; email: string }];
      expect(payload.sub).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
    });

    it('devrait lancer UnauthorizedException si user non trouvé', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh(999)).rejects.toThrow(UnauthorizedException);
    });

    it('devrait lancer UnauthorizedException si user inactif', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, actif: false });

      await expect(service.refresh(1)).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // getProfile
  // -------------------------------------------------------------------------
  describe('getProfile', () => {
    it('devrait retourner le profil sans mot de passe', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile(1);

      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('password');
    });

    it('devrait lancer NotFoundException si user non trouvé', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
    });
  });
});
