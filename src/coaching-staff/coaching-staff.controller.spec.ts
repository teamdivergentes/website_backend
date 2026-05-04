import { Test, TestingModule } from '@nestjs/testing';
import { CoachingStaffController } from './coaching-staff.controller';
import { CoachingStaffService } from './coaching-staff.service';
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
      const staff = [
        { id: 1, name: 'Head Coach', role: 'Head Coach', teamId: 1 },
      ];
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
    it('devrait appeler coachingStaffService.update avec l\'id et le DTO', async () => {
      const dto: UpdateCoachingStaffDto = { role: 'Head Analyst' };
      const updated = { id: 1, name: 'Head Coach', role: 'Head Analyst', teamId: 1 };
      mockCoachingStaffService.update.mockResolvedValue(updated);

      const result = await controller.update(1, dto);

      expect(mockCoachingStaffService.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });
  });

  // ─── reorder (admin) ─────────────────────────────────────────────────────────

  describe('reorder', () => {
    it('devrait appeler coachingStaffService.reorder avec le teamId et le DTO', async () => {
      const dto: ReorderCoachingStaffDto = { ids: [2, 1, 3] };
      const reordered = [
        { id: 2, position: 0 },
        { id: 1, position: 1 },
        { id: 3, position: 2 },
      ];
      mockCoachingStaffService.reorder.mockResolvedValue(reordered);

      const result = await controller.reorder(1, dto);

      expect(mockCoachingStaffService.reorder).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(reordered);
    });
  });

  // ─── delete (admin) ──────────────────────────────────────────────────────────

  describe('delete', () => {
    it('devrait appeler coachingStaffService.delete avec l\'id', async () => {
      mockCoachingStaffService.delete.mockResolvedValue({ id: 1 });

      const result = await controller.delete(1);

      expect(mockCoachingStaffService.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });
});
