import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedpassword',
    roleId: 1,
    actif: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: 1,
      name: 'admin',
      permissions: ['users:read', 'users:write'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('should return paginated users with filters', async () => {
      const users = [mockUser];
      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.findAllPaginated({
        page: 1,
        limit: 20,
        search: 'test',
        roleId: 1,
        actif: true,
        sortBy: 'email',
        sortOrder: 'asc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty('password');
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          email: { contains: 'test', mode: 'insensitive' },
          roleId: 1,
          actif: true,
        },
        include: { role: true },
        skip: 0,
        take: 20,
        orderBy: { email: 'asc' },
      });
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(50);

      const result = await service.findAllPaginated({
        page: 2,
        limit: 10,
      });

      expect(result.meta.totalPages).toBe(5);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(null); // No conflict with email
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.update(1, { email: 'newemail@example.com' });

      expect(result).not.toHaveProperty('password');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { email: 'test@test.com' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, id: 2 });

      await expect(service.update(1, { email: 'existing@example.com' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updatePassword', () => {
    it('should hash and update password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashed');

      await service.updatePassword(1, { newPassword: 'newpassword123' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'newhashed' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.updatePassword(999, { newPassword: 'test123456' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleActive', () => {
    it('should toggle user active status', async () => {
      const activeUser = { ...mockUser, actif: true };
      mockPrismaService.user.findUnique.mockResolvedValue(activeUser);
      mockPrismaService.user.update.mockResolvedValue({ ...activeUser, actif: false });

      const result = await service.toggleActive(1);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { actif: false },
        include: { role: true },
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.toggleActive(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRole', () => {
    it('should assign new role to user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.role.findUnique.mockResolvedValue(mockUser.role);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.assignRole(1, 2);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { roleId: 2 },
        include: { role: true },
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.assignRole(999, 2)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if role not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.assignRole(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      await service.delete(1);

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create user with hashed password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const result = await service.create({
        email: 'new@example.com',
        password: 'password123',
        roleId: 1,
        actif: true,
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(result).not.toHaveProperty('password');
    });

    it('should throw ConflictException if email exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'test@example.com',
          password: 'password123',
          roleId: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should use default role if roleId not provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.role.findFirst.mockResolvedValue({ id: 3, name: 'user' });
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      await service.create({
        email: 'new@example.com',
        password: 'password123',
      });

      expect(mockPrismaService.role.findFirst).toHaveBeenCalledWith({
        where: { name: 'user' },
      });
    });
  });
});
