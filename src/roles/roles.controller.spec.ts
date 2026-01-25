import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

describe('RolesController', () => {
  let controller: RolesController;

  const mockRolesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of roles with user count', async () => {
      const mockRoles = [
        {
          id: 1,
          name: 'Admin',
          permissions: ['users:read'],
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          userCount: 5,
        },
      ];

      mockRolesService.findAll.mockResolvedValue(mockRoles);

      const result = await controller.findAll();

      expect(result).toEqual(mockRoles);
      expect(mockRolesService.findAll).toHaveBeenCalled();
    });
  });

  describe('getPermissions', () => {
    it('should return all available permissions grouped by module', () => {
      const mockPermissions = {
        users: ['users:read', 'users:write', 'users:delete'],
        roles: ['roles:read', 'roles:write', 'roles:delete'],
      };

      mockRolesService.getPermissions.mockReturnValue(mockPermissions);

      const result = controller.getPermissions();

      expect(result).toEqual(mockPermissions);
      expect(mockRolesService.getPermissions).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single role', async () => {
      const mockRole = {
        id: 1,
        name: 'Admin',
        permissions: ['users:read'],
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRolesService.findOne.mockResolvedValue(mockRole);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockRole);
      expect(mockRolesService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a new role', async () => {
      const createRoleDto = {
        name: 'NewRole',
        permissions: ['users:read'],
      };

      const mockCreatedRole = {
        id: 1,
        ...createRoleDto,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRolesService.create.mockResolvedValue(mockCreatedRole);

      const result = await controller.create(createRoleDto);

      expect(result).toEqual(mockCreatedRole);
      expect(mockRolesService.create).toHaveBeenCalledWith(createRoleDto);
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      const updateRoleDto = {
        name: 'UpdatedRole',
        permissions: ['users:write'],
      };

      const mockUpdatedRole = {
        id: 1,
        ...updateRoleDto,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRolesService.update.mockResolvedValue(mockUpdatedRole);

      const result = await controller.update(1, updateRoleDto);

      expect(result).toEqual(mockUpdatedRole);
      expect(mockRolesService.update).toHaveBeenCalledWith(1, updateRoleDto);
    });
  });

  describe('delete', () => {
    it('should delete a role', async () => {
      const mockResponse = { message: 'Rôle supprimé avec succès' };

      mockRolesService.delete.mockResolvedValue(mockResponse);

      const result = await controller.delete(1);

      expect(result).toEqual(mockResponse);
      expect(mockRolesService.delete).toHaveBeenCalledWith(1);
    });
  });
});
