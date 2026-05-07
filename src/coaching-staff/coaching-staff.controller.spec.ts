import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { CoachingStaffController } from './coaching-staff.controller';
import { CoachingStaffService } from './coaching-staff.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateCoachingStaffDto } from './dto/create-coaching-staff.dto';
import { UpdateCoachingStaffDto } from './dto/update-coaching-staff.dto';
import { ReorderCoachingStaffDto } from './dto/reorder-coaching-staff.dto';

describe('CoachingStaffController', () => {
  let controller: CoachingStaffController;

  const mockCoachingStaffService = {
    findByTeam: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    reorder: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoachingStaffController],
      providers: [
        {
          provide: CoachingStaffService,
          useValue: mockCoachingStaffService,
        },
        PermissionsGuard,
        Reflector,
      ],
    }).compile();

    controller = module.get<CoachingStaffController>(CoachingStaffController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  // ─── findByTeamPublic (public) ────────────────────────────────────────────────

  describe('findByTeamPublic', () => {
    it('devrait appeler coachingStaffService.findByTeam avec le teamId', async () => {
      const staff = [{ id: 1, name: 'Head Coach', role: 'Head Coach', teamId: 1 }];
      mockCoachingStaffService.findByTeam.mockResolvedValue(staff);

      const result = await controller.findByTeamPublic(1);

      expect(mockCoachingStaffService.findByTeam).toHaveBeenCalledWith(1);
      expect(result).toEqual(staff);
    });
  });

  // ─── findByTeamAdmin (admin) ─────────────────────────────────────────────────

  describe('findByTeamAdmin', () => {
    it('devrait appeler coachingStaffService.findByTeam avec le teamId', async () => {
      const staff = [
        { id: 1, name: 'Head Coach', role: 'Head Coach', teamId: 1 },
        { id: 2, name: 'Drafter', role: 'Drafter', teamId: 1 },
      ];
      mockCoachingStaffService.findByTeam.mockResolvedValue(staff);

      const result = await controller.findByTeamAdmin(1);

      expect(mockCoachingStaffService.findByTeam).toHaveBeenCalledWith(1);
      expect(result).toEqual(staff);
    });
  });

  // ─── create (admin) ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('devrait appeler coachingStaffService.create avec le teamId et le DTO', async () => {
      const dto: CreateCoachingStaffDto = {
        name: 'Nouveau Coach',
        role: 'Analyst',
      };
      const created = { id: 3, ...dto, teamId: 1, position: 2 };
      mockCoachingStaffService.create.mockResolvedValue(created);

      const result = await controller.create(1, dto);

      expect(mockCoachingStaffService.create).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(created);
    });
  });

  // ─── update (admin) ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('devrait appeler coachingStaffService.update avec teamId, id et le DTO (DB-01)', async () => {
      const dto: UpdateCoachingStaffDto = { role: 'Head Analyst' };
      const updated = { id: 1, name: 'Head Coach', role: 'Head Analyst', teamId: 1 };
      mockCoachingStaffService.update.mockResolvedValue(updated);

      const result = await controller.update(1, 1, dto);

      expect(mockCoachingStaffService.update).toHaveBeenCalledWith(1, 1, dto);
      expect(result).toEqual(updated);
    });
  });

  // ─── reorder (admin) ─────────────────────────────────────────────────────────

  describe('reorder', () => {
    it('devrait appeler coachingStaffService.reorder avec le teamId et le DTO', async () => {
      const dto: ReorderCoachingStaffDto = {
        items: [
          { id: 2, position: 0 },
          { id: 1, position: 1 },
        ],
      };
      mockCoachingStaffService.reorder.mockResolvedValue({
        message: 'Ordre mis à jour avec succès',
      });

      const result = await controller.reorder(1, dto);

      expect(mockCoachingStaffService.reorder).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual({ message: 'Ordre mis à jour avec succès' });
    });
  });

  // ─── delete (admin) ──────────────────────────────────────────────────────────

  describe('delete', () => {
    it('devrait appeler coachingStaffService.delete avec teamId et id (DB-01)', async () => {
      mockCoachingStaffService.delete.mockResolvedValue({ message: 'Coach supprimé avec succès' });

      const result = await controller.delete(1, 1);

      expect(mockCoachingStaffService.delete).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual({ message: 'Coach supprimé avec succès' });
    });
  });

  // ─── PermissionsGuard (SEC-003) ───────────────────────────────────────────────
  // Les métadonnées NestJS sont posées sur le prototype de la classe, pas sur
  // l'instance. On y accède via CoachingStaffController.prototype.

  describe('PermissionsGuard metadata (SEC-003)', () => {
    const getPerms = (methodName: keyof typeof CoachingStaffController.prototype): string[] => {
      const fn = CoachingStaffController.prototype[methodName] as object;
      return Reflect.getMetadata('permissions', fn) as string[];
    };

    it('devrait avoir RequirePermission coaching_staff:read sur findByTeamAdmin', () => {
      expect(getPerms('findByTeamAdmin')).toContain('coaching_staff:read');
    });

    it('devrait avoir RequirePermission coaching_staff:write sur create', () => {
      expect(getPerms('create')).toContain('coaching_staff:write');
    });

    it('devrait avoir RequirePermission coaching_staff:write sur update', () => {
      expect(getPerms('update')).toContain('coaching_staff:write');
    });

    it('devrait avoir RequirePermission coaching_staff:delete sur delete', () => {
      expect(getPerms('delete')).toContain('coaching_staff:delete');
    });
  });
});
