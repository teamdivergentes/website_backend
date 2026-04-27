import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    getProfile: jest.fn(),
  };

  // Helper pour créer un mock de Response Express
  const createMockResponse = (): Partial<Response> & {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
    status: jest.Mock;
    json: jest.Mock;
  } => {
    const res = {
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // POST /api/auth/login — HttpOnly cookie
  // -------------------------------------------------------------------------
  describe('login', () => {
    const loginDto = { email: 'admin@example.com', password: 'admin123' };
    const serviceResult = {
      access_token: 'jwt-token',
      user: {
        id: 1,
        email: 'admin@example.com',
        role: { id: 1, name: 'Admin', permissions: ['users:read'] },
      },
    };

    it('devrait poser le cookie dvg_auth_token HttpOnly et retourner { user }', async () => {
      mockAuthService.login.mockResolvedValue(serviceResult);
      const res = createMockResponse();

      await controller.login(loginDto, res as unknown as Response);

      // Le cookie dvg_auth_token doit être posé
      expect(res.cookie).toHaveBeenCalledWith(
        'dvg_auth_token',
        'jwt-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        }),
      );

      // La réponse JSON doit contenir user
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: serviceResult.user }));

      // La réponse JSON ne doit PAS contenir access_token
      const jsonCalls = (res.json as jest.Mock).mock.calls as [Record<string, unknown>][];
      expect(jsonCalls[0][0]).not.toHaveProperty('access_token');
    });

    it('devrait appeler authService.login avec le DTO', async () => {
      mockAuthService.login.mockResolvedValue(serviceResult);
      const res = createMockResponse();

      await controller.login(loginDto, res as unknown as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/auth/logout — effacement des cookies
  // -------------------------------------------------------------------------
  describe('logout', () => {
    it('devrait effacer le cookie dvg_auth_token et retourner un message', () => {
      const res = createMockResponse();

      controller.logout(res as unknown as Response);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'dvg_auth_token',
        expect.objectContaining({ path: '/' }),
      );
      const jsonCalls2 = (res.json as jest.Mock).mock.calls as [Record<string, unknown>][];
      expect(typeof jsonCalls2[0][0]['message']).toBe('string');
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/auth/refresh — rotation du JWT via cookie
  // -------------------------------------------------------------------------
  describe('refresh', () => {
    it('devrait émettre un nouveau cookie et retourner 204', async () => {
      const mockUser = { id: 1, email: 'admin@example.com' };
      const mockReq = { user: mockUser, cookies: { dvg_auth_token: 'old-token' } };
      const res = createMockResponse();
      mockAuthService.refresh.mockResolvedValue({ access_token: 'new-jwt-token' });

      await controller.refresh(mockReq as never, res as unknown as Response);

      expect(res.cookie).toHaveBeenCalledWith(
        'dvg_auth_token',
        'new-jwt-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('devrait appeler authService.refresh avec userId', async () => {
      const mockUser = { id: 42, email: 'admin@example.com' };
      const mockReq = { user: mockUser, cookies: { dvg_auth_token: 'old-token' } };
      const res = createMockResponse();
      mockAuthService.refresh.mockResolvedValue({ access_token: 'new-jwt-token' });

      await controller.refresh(mockReq as never, res as unknown as Response);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(42);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/auth/me
  // -------------------------------------------------------------------------
  describe('getProfile', () => {
    it('devrait retourner le profil utilisateur', async () => {
      const mockUser = { id: 1, email: 'admin@example.com' };
      const mockReq = { user: mockUser };
      const mockProfile = {
        id: 1,
        email: 'admin@example.com',
        role: { id: 1, name: 'Admin', permissions: [] },
        actif: true,
        createdAt: new Date().toISOString(),
      };
      mockAuthService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(mockReq as never);

      expect(result).toEqual(mockProfile);
      expect(mockAuthService.getProfile).toHaveBeenCalledWith(1);
    });
  });
});
