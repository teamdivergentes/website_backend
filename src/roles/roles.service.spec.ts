import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    role: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPermissions', () => {
    it('should return all available permissions grouped by module', () => {
      const permissions = service.getPermissions();

      expect(permissions).toHaveProperty('users');
      expect(permissions).toHaveProperty('roles');
      expect(permissions).toHaveProperty('teams');
      expect(permissions).toHaveProperty('games');
      expect(permissions).toHaveProperty('sponsors');
      expect(permissions).toHaveProperty('staff');
      expect(permissions).toHaveProperty('config');
      expect(permissions).toHaveProperty('annonces');
      expect(permissions).toHaveProperty('articles');

      expect(permissions.users).toContain('users:read');
      expect(permissions.users).toContain('users:write');
      expect(permissions.users).toContain('users:delete');
    });
  });

  describe('findAll', () => {
    it('should return all roles with user count', async () => {
      const mockRoles = [
        {
          id: 1,
          name: 'Admin',
          permissions: ['users:read'],
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { users: 5 },
        },
        {
          id: 2,
          name: 'CM',
          permissions: ['annonces:read'],
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { users: 2 },
        },
      ];

      mockPrismaService.role.findMany.mockResolvedValue(mockRoles);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('userCount', 5);
      expect(result[1]).toHaveProperty('userCount', 2);
      expect(result[0]._count).toBeUndefined();
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'asc' },
        include: {
          _count: {
            select: { users: true },
          },
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a role by id', async () => {
      const mockRole = {
        id: 1,
        name: 'Admin',
        permissions: ['users:read'],
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);

      const result = await service.findOne(1);

      expect(result).toEqual(mockRole);
      expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if role not found', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new role', async () => {
      const createRoleDto = {
        name: 'NewRole',
        permissions: ['users:read'],
      };

      const mockCreatedRole = {
        id: 3,
        ...createRoleDto,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.role.findUnique.mockResolvedValue(null);
      mockPrismaService.role.create.mockResolvedValue(mockCreatedRole);

      const result = await service.create(createRoleDto);

      expect(result).toEqual(mockCreatedRole);
      expect(prisma.role.create).toHaveBeenCalledWith({
        data: {
          name: createRoleDto.name,
          permissions: createRoleDto.permissions,
        },
      });
    });

    it('should throw ConflictException if role name already exists', async () => {
      const createRoleDto = {
        name: 'Admin',
        permissions: ['users:read'],
      };

      mockPrismaService.role.findUnique.mockResolvedValue({ id: 1, name: 'Admin' });

      await expect(service.create(createRoleDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      const updateRoleDto = {
        name: 'UpdatedRole',
        permissions: ['users:write'],
      };

      const existingRole = {
        id: 1,
        name: 'OldRole',
        permissions: ['users:read'],
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedRole = {
        ...existingRole,
        ...updateRoleDto,
      };

      mockPrismaService.role.findUnique
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce(null);
      mockPrismaService.role.update.mockResolvedValue(updatedRole);

      const result = await service.update(1, updateRoleDto);

      expect(result).toEqual(updatedRole);
      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateRoleDto,
      });
    });

    it('should throw NotFoundException if role not found', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new name already exists', async () => {
      const existingRole = { id: 1, name: 'Role1' };
      const conflictingRole = { id: 2, name: 'Role2' };

      mockPrismaService.role.findUnique
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce(conflictingRole);

      await expect(service.update(1, { name: 'Role2' })).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete a non-system role with no users', async () => {
      const mockRole = {
        id: 1,
        name: 'CustomRole',
        permissions: ['users:read'],
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [],
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.role.delete.mockResolvedValue(mockRole);

      const result = await service.delete(1);

      expect(result).toEqual({ message: 'Rôle supprimé avec succès' });
      expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if role not found', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to delete system role', async () => {
      const mockSystemRole = {
        id: 1,
        name: 'Admin',
        permissions: ['users:read'],
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [],
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockSystemRole);

      await expect(service.delete(1)).rejects.toThrow(
        new BadRequestException('Impossible de supprimer un rôle système'),
      );
      expect(prisma.role.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if role has assigned users', async () => {
      const mockRole = {
        id: 1,
        name: 'CustomRole',
        permissions: ['users:read'],
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [{ id: 1 }, { id: 2 }],
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);

      await expect(service.delete(1)).rejects.toThrow(
        new BadRequestException(
          'Ce rôle est assigné à 2 utilisateur(s). Réassignez-les avant de supprimer ce rôle.',
        ),
      );
      expect(prisma.role.delete).not.toHaveBeenCalled();
    });
  });
});
