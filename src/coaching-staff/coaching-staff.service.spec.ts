import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CoachingStaffService } from './coaching-staff.service';
import { PrismaService } from '../prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateCoachingStaffDto } from './dto/create-coaching-staff.dto';
import { UpdateCoachingStaffDto } from './dto/update-coaching-staff.dto';
import { ReorderCoachingStaffDto } from './dto/reorder-coaching-staff.dto';

describe('CoachingStaffService', () => {
  let service: CoachingStaffService;

  const mockPrisma = {
    team: {
      findUnique: jest.fn(),
    },
    coachingStaff: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUploadService = {
    deleteImage: jest.fn(),
  };

  const sampleTeam = { id: 1, name: 'DVG Valorant', slug: 'dvg-valorant' };
  const sampleCoach = {
    id: 1,
    teamId: 1,
    name: 'Jean Coach',
    realName: 'Jean Dupont',
    role: 'Head Coach',
    image: null,
    biography: null,
    position: 0,
    socials: null,
    slug: 'jean-coach',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoachingStaffService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    service = module.get<CoachingStaffService>(CoachingStaffService);
  });

  // ─── findByTeam ──────────────────────────────────────────────────────────────

  describe('findByTeam', () => {
    it('should return coaching staff for a team', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(sampleTeam);
      mockPrisma.coachingStaff.findMany.mockResolvedValue([sampleCoach]);

      const result: Awaited<ReturnType<typeof service.findByTeam>> = await service.findByTeam(1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Jean Coach');
    });

    it('should throw NotFoundException when team does not exist', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);
      await expect(service.findByTeam(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a coach by id', async () => {
      mockPrisma.coachingStaff.findUnique.mockResolvedValue(sampleCoach);
      const result: Awaited<ReturnType<typeof service.findOne>> = await service.findOne(1);
      expect(result).toEqual(sampleCoach);
    });

    it('should throw NotFoundException when coach not found', async () => {
      mockPrisma.coachingStaff.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a coaching staff member with auto-generated slug', async () => {
      const dto: CreateCoachingStaffDto = { name: 'Marie Coach', role: 'Drafter' };

      mockPrisma.team.findUnique.mockResolvedValue(sampleTeam);
      mockPrisma.coachingStaff.aggregate.mockResolvedValue({ _max: { position: 1 } });
      mockPrisma.coachingStaff.findFirst.mockResolvedValue(null); // slug not taken
      mockPrisma.coachingStaff.create.mockResolvedValue({
        ...sampleCoach,
        id: 2,
        name: 'Marie Coach',
        role: 'Drafter',
        slug: 'marie-coach',
        teamId: 1,
      });

      const result: Awaited<ReturnType<typeof service.create>> = await service.create(1, dto);

      expect(result.name).toBe('Marie Coach');
      const createCall = mockPrisma.coachingStaff.create.mock.calls[0] as [
        { data: { slug: string } },
      ];
      expect(createCall[0].data.slug).toBe('marie-coach');
    });

    it('should handle slug collision by appending a counter', async () => {
      const dto: CreateCoachingStaffDto = { name: 'Jean Coach', role: 'Manager' };

      mockPrisma.team.findUnique.mockResolvedValue(sampleTeam);
      mockPrisma.coachingStaff.aggregate.mockResolvedValue({ _max: { position: 0 } });
      // First slug 'jean-coach' is taken, 'jean-coach-2' is not
      mockPrisma.coachingStaff.findFirst
        .mockResolvedValueOnce({ id: 1, slug: 'jean-coach' })
        .mockResolvedValueOnce(null);

      mockPrisma.coachingStaff.create.mockResolvedValue({
        ...sampleCoach,
        id: 3,
        slug: 'jean-coach-2',
      });

      await service.create(1, dto);

      const createCallCollision = mockPrisma.coachingStaff.create.mock.calls[0] as [
        { data: { slug: string } },
      ];
      expect(createCallCollision[0].data.slug).toBe('jean-coach-2');
    });

    it('should use explicit slug if provided', async () => {
      const dto: CreateCoachingStaffDto = {
        name: 'Test Coach',
        role: 'Coach',
        slug: 'custom-slug',
      };

      mockPrisma.team.findUnique.mockResolvedValue(sampleTeam);
      mockPrisma.coachingStaff.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrisma.coachingStaff.findFirst.mockResolvedValue(null);
      mockPrisma.coachingStaff.create.mockResolvedValue({
        ...sampleCoach,
        id: 4,
        slug: 'custom-slug',
      });

      await service.create(1, dto);

      const createCallExplicit = mockPrisma.coachingStaff.create.mock.calls[0] as [
        { data: { slug: string } },
      ];
      expect(createCallExplicit[0].data.slug).toBe('custom-slug');
    });

    it('should throw NotFoundException when team does not exist', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);
      await expect(service.create(999, { name: 'Coach', role: 'Drafter' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update a coaching staff member', async () => {
      const dto: UpdateCoachingStaffDto = { role: 'Manager' };
      mockPrisma.coachingStaff.findFirst.mockResolvedValue(sampleCoach);
      mockPrisma.coachingStaff.update.mockResolvedValue({ ...sampleCoach, role: 'Manager' });

      const result: Awaited<ReturnType<typeof service.update>> = await service.update(1, 1, dto);
      expect(result.role).toBe('Manager');
    });

    it('should delete old image when updating with new image', async () => {
      const dto: UpdateCoachingStaffDto = { image: '/uploads/new.jpg' };
      const coachWithImage = { ...sampleCoach, image: '/uploads/old.jpg' };
      mockPrisma.coachingStaff.findFirst.mockResolvedValue(coachWithImage);
      mockPrisma.coachingStaff.update.mockResolvedValue({
        ...coachWithImage,
        image: '/uploads/new.jpg',
      });

      await service.update(1, 1, dto);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('old.jpg');
    });

    it('should throw NotFoundException when coach not found in team', async () => {
      mockPrisma.coachingStaff.findFirst.mockResolvedValue(null);
      await expect(service.update(1, 999, {})).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException (IDOR) when id belongs to another team (DB-01)', async () => {
      // teamId=2 demande l'id=1 qui appartient à teamId=1 → findFirst({ id:1, teamId:2 }) = null
      mockPrisma.coachingStaff.findFirst.mockResolvedValue(null);
      await expect(service.update(2, 1, { role: 'Hacker' })).rejects.toThrow(NotFoundException);
    });

    it('should regenerate slug when name changes', async () => {
      const dto: UpdateCoachingStaffDto = { name: 'New Name' };
      mockPrisma.coachingStaff.findFirst
        .mockResolvedValueOnce(sampleCoach) // findFirst({ id, teamId }) → coach trouvé
        .mockResolvedValueOnce(null); // findFirst pour unicité du slug → libre
      mockPrisma.coachingStaff.update.mockResolvedValue({
        ...sampleCoach,
        name: 'New Name',
        slug: 'new-name',
      });

      await service.update(1, 1, dto);

      const updateCall = mockPrisma.coachingStaff.update.mock.calls[0] as [
        { where: { id: number }; data: { slug: string } },
      ];
      expect(updateCall[0].data.slug).toBe('new-name');
    });

    it('should throw ConflictException when slug is already taken on update', async () => {
      const dto: UpdateCoachingStaffDto = { slug: 'existing-slug' };
      mockPrisma.coachingStaff.findFirst
        .mockResolvedValueOnce(sampleCoach) // findFirst({ id, teamId }) → coach trouvé
        .mockResolvedValueOnce({ id: 99, slug: 'existing-slug' }); // slug pris par un autre coach

      await expect(service.update(1, 1, dto)).rejects.toThrow(ConflictException);
    });

    it('should update with explicit slug when not taken', async () => {
      const dto: UpdateCoachingStaffDto = { slug: 'new-unique-slug' };
      mockPrisma.coachingStaff.findFirst
        .mockResolvedValueOnce(sampleCoach) // findFirst({ id, teamId }) → coach trouvé
        .mockResolvedValueOnce(null); // slug libre
      mockPrisma.coachingStaff.update.mockResolvedValue({
        ...sampleCoach,
        slug: 'new-unique-slug',
      });

      const result: Awaited<ReturnType<typeof service.update>> = await service.update(1, 1, dto);
      expect(result.slug).toBe('new-unique-slug');
    });

    it('should throw NotFoundException on P2025 in update catch', async () => {
      mockPrisma.coachingStaff.findFirst.mockResolvedValue(sampleCoach);
      mockPrisma.coachingStaff.update.mockRejectedValue({ code: 'P2025', message: 'Not found' });

      await expect(service.update(1, 1, { role: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should re-throw non-P2025 errors from update', async () => {
      mockPrisma.coachingStaff.findFirst.mockResolvedValue(sampleCoach);
      mockPrisma.coachingStaff.update.mockRejectedValue(new Error('DB timeout'));

      await expect(service.update(1, 1, { role: 'X' })).rejects.toThrow('DB timeout');
    });
  });

  // ─── delete ──────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete a coaching staff member', async () => {
      mockPrisma.coachingStaff.findFirst.mockResolvedValue(sampleCoach);
      mockPrisma.coachingStaff.delete.mockResolvedValue(sampleCoach);

      const result = await service.delete(1, 1);
      expect(result).toEqual({ message: 'Coach supprimé avec succès' });
    });

    it('should delete image when deleting coach with image', async () => {
      const coachWithImage = { ...sampleCoach, image: '/uploads/coach.jpg' };
      mockPrisma.coachingStaff.findFirst.mockResolvedValue(coachWithImage);
      mockPrisma.coachingStaff.delete.mockResolvedValue(coachWithImage);

      await service.delete(1, 1);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith('coach.jpg');
    });

    it('should throw NotFoundException when coach not found in team', async () => {
      mockPrisma.coachingStaff.findFirst.mockResolvedValue(null);
      await expect(service.delete(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException (IDOR) when id belongs to another team (DB-01)', async () => {
      // teamId=2 tente de supprimer id=1 qui appartient à teamId=1
      mockPrisma.coachingStaff.findFirst.mockResolvedValue(null);
      await expect(service.delete(2, 1)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── reorder ─────────────────────────────────────────────────────────────────

  describe('reorder', () => {
    it('should reorder coaching staff', async () => {
      const dto: ReorderCoachingStaffDto = {
        items: [
          { id: 1, position: 1 },
          { id: 2, position: 0 },
        ],
      };

      mockPrisma.coachingStaff.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockPrisma.$transaction.mockResolvedValue([]);

      const result: Awaited<ReturnType<typeof service.reorder>> = await service.reorder(1, dto);
      expect(result).toEqual({ message: 'Ordre mis à jour avec succès' });
    });

    it('should throw BadRequestException when an ID does not belong to the team (IDOR)', async () => {
      // teamId = 1 (team A), but dto contains id=99 which belongs to team B
      const dto: ReorderCoachingStaffDto = {
        items: [{ id: 99, position: 0 }],
      };

      // findMany returns empty: id=99 is not in teamId=1
      mockPrisma.coachingStaff.findMany.mockResolvedValue([]);

      await expect(service.reorder(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when only some IDs belong to the team (partial IDOR)', async () => {
      const dto: ReorderCoachingStaffDto = {
        items: [
          { id: 1, position: 0 }, // belongs to team 1
          { id: 99, position: 1 }, // belongs to team 2
        ],
      };

      // Only id=1 is returned: id=99 is foreign
      mockPrisma.coachingStaff.findMany.mockResolvedValue([{ id: 1 }]);

      await expect(service.reorder(1, dto)).rejects.toThrow(BadRequestException);
    });
  });
});
