import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma.service';
import { createPrismaMock, PrismaMock } from '../../test/helpers/prisma-mock';
import { UpdateProfileDto, ChangePasswordDto } from './dto/profile.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaMock: PrismaMock;

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
    email: 'admin@teamdivergentes.fr',
    password: 'hashed_password',
    roleId: 1,
    actif: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: mockRole,
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfileService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // getProfile
  // ---------------------------------------------------------------------------
  describe('getProfile', () => {
    it('devrait retourner le profil sans le mot de passe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile(1);

      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('password');
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { role: true },
      });
    });

    it("devrait lever NotFoundException si l'utilisateur est introuvable", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // updateProfile
  // ---------------------------------------------------------------------------
  describe('updateProfile', () => {
    it("devrait mettre à jour l'email et retourner le profil sans mot de passe", async () => {
      const dto: UpdateProfileDto = { email: 'nouveau@teamdivergentes.fr' };
      const updatedUser = { ...mockUser, email: dto.email, role: mockRole };

      prismaMock.user.findUnique
        .mockResolvedValueOnce(mockUser) // vérification utilisateur existant
        .mockResolvedValueOnce(null); // vérification unicité email
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(1, dto);

      expect(result.email).toBe('nouveau@teamdivergentes.fr');
      expect(result).not.toHaveProperty('password');
    });

    it("devrait lever NotFoundException si l'utilisateur est introuvable", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile(999, { email: 'test@test.fr' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("devrait lever ConflictException si l'email est déjà utilisé", async () => {
      const dto: UpdateProfileDto = { email: 'pris@teamdivergentes.fr' };
      const otherUser = { ...mockUser, id: 2, email: dto.email };

      prismaMock.user.findUnique
        .mockResolvedValueOnce(mockUser) // utilisateur courant
        .mockResolvedValueOnce(otherUser); // email déjà pris

      await expect(service.updateProfile(1, dto)).rejects.toThrow(ConflictException);
    });

    it('devrait accepter le même email (pas de conflit)', async () => {
      const dto: UpdateProfileDto = { email: mockUser.email };
      const updatedUser = { ...mockUser, role: mockRole };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(1, dto);

      // findUnique pour l'unicité email ne doit pas être appelé (même email)
      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
      expect(result.email).toBe(mockUser.email);
    });
  });

  // ---------------------------------------------------------------------------
  // changePassword
  // ---------------------------------------------------------------------------
  describe('changePassword', () => {
    it("devrait changer le mot de passe si l'ancien est correct", async () => {
      const dto: ChangePasswordDto = {
        currentPassword: 'ancien_mdp',
        newPassword: 'nouveau_mdp_fort',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('nouveau_hash');
      prismaMock.user.update.mockResolvedValue({ ...mockUser, password: 'nouveau_hash' });

      await service.changePassword(1, dto);

      expect(bcrypt.compare).toHaveBeenCalledWith('ancien_mdp', mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith('nouveau_mdp_fort', 12);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'nouveau_hash' },
      });
    });

    it("devrait lever UnauthorizedException si l'ancien mot de passe est incorrect", async () => {
      const dto: ChangePasswordDto = {
        currentPassword: 'mauvais_mdp',
        newPassword: 'nouveau_mdp_fort',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(1, dto)).rejects.toThrow(UnauthorizedException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("devrait lever NotFoundException si l'utilisateur est introuvable", async () => {
      const dto: ChangePasswordDto = {
        currentPassword: 'mdp',
        newPassword: 'nouveau_mdp_fort',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.changePassword(999, dto)).rejects.toThrow(NotFoundException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });
});
