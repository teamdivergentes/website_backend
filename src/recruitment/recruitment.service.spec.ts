import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';
import { PrismaService } from '../prisma.service';
import { createPrismaMock, PrismaMock } from '../../test/helpers/prisma-mock';
import { CreateRecruitmentDto } from './dto/create-recruitment.dto';
import { UpdateRecruitmentDto } from './dto/update-recruitment.dto';
import { Prisma } from '../../generated/prisma';

describe('RecruitmentService', () => {
  let service: RecruitmentService;
  let prismaMock: PrismaMock;

  const mockPost = {
    id: 1,
    title: 'Joueur Valorant',
    type: 'Joueur',
    description: 'Recrutement joueur Valorant',
    image: null,
    active: true,
    position: 0,
    slug: 'joueur-valorant',
    location: 'Remote',
    duration: '6 mois',
    missions: null,
    skills: null,
    requirements: null,
    benefits: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RecruitmentService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<RecruitmentService>(RecruitmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('devrait retourner tous les postes triés par position', async () => {
      const posts = [mockPost, { ...mockPost, id: 2, title: 'Joueur LoL', position: 1 }];
      prismaMock.recruitmentPost.findMany.mockResolvedValue(posts);

      const result = await service.findAll();

      expect(result).toEqual(posts);
      expect(prismaMock.recruitmentPost.findMany).toHaveBeenCalledWith({
        orderBy: { position: 'asc' },
      });
    });

    it('devrait retourner un tableau vide si aucun poste', async () => {
      prismaMock.recruitmentPost.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findAllActive
  // ---------------------------------------------------------------------------
  describe('findAllActive', () => {
    it('devrait retourner uniquement les postes actifs', async () => {
      prismaMock.recruitmentPost.findMany.mockResolvedValue([mockPost]);

      const result = await service.findAllActive();

      expect(result).toEqual([mockPost]);
      expect(prismaMock.recruitmentPost.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { position: 'asc' },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it("devrait retourner le poste correspondant à l'id", async () => {
      prismaMock.recruitmentPost.findUnique.mockResolvedValue(mockPost);

      const result = await service.findOne(1);

      expect(result).toEqual(mockPost);
      expect(prismaMock.recruitmentPost.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('devrait lever NotFoundException si le poste est introuvable', async () => {
      prismaMock.recruitmentPost.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // findBySlug
  // ---------------------------------------------------------------------------
  describe('findBySlug', () => {
    it('devrait retourner le poste correspondant au slug', async () => {
      prismaMock.recruitmentPost.findUnique.mockResolvedValue(mockPost);

      const result = await service.findBySlug('joueur-valorant');

      expect(result).toEqual(mockPost);
    });

    it('devrait lever NotFoundException si le slug est introuvable', async () => {
      prismaMock.recruitmentPost.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('slug-inexistant')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('devrait créer un poste avec un slug généré depuis le titre', async () => {
      const dto: CreateRecruitmentDto = {
        title: 'Joueur Valorant',
        type: 'Joueur',
        description: 'Recrutement joueur',
      };

      // aggregate pour position max
      prismaMock.recruitmentPost.aggregate.mockResolvedValue({ _max: { position: 2 } });
      // findUnique pour generateUniqueSlug (slug libre)
      prismaMock.recruitmentPost.findUnique.mockResolvedValue(null);
      prismaMock.recruitmentPost.create.mockResolvedValue({ ...mockPost, position: 3 });

      const result = await service.create(dto);

      expect(prismaMock.recruitmentPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: dto.title,
            slug: 'joueur-valorant',
            position: 3,
          }),
        }),
      );
      expect(result.position).toBe(3);
    });

    it('devrait utiliser le slug fourni dans le DTO si présent', async () => {
      const dto: CreateRecruitmentDto = {
        title: 'Joueur Valorant',
        type: 'Joueur',
        description: 'Description',
        slug: 'mon-slug-custom',
      };

      prismaMock.recruitmentPost.aggregate.mockResolvedValue({ _max: { position: null } });
      prismaMock.recruitmentPost.create.mockResolvedValue({
        ...mockPost,
        slug: 'mon-slug-custom',
        position: 0,
      });

      const result = await service.create(dto);

      expect(result.slug).toBe('mon-slug-custom');
    });

    it('devrait initialiser la position à 0 si aucun poste existant', async () => {
      const dto: CreateRecruitmentDto = {
        title: 'Premier poste',
        type: 'Joueur',
        description: 'Desc',
      };

      prismaMock.recruitmentPost.aggregate.mockResolvedValue({ _max: { position: null } });
      prismaMock.recruitmentPost.findUnique.mockResolvedValue(null);
      prismaMock.recruitmentPost.create.mockResolvedValue({ ...mockPost, position: 0 });

      const result = await service.create(dto);

      expect(prismaMock.recruitmentPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ position: 0 }),
        }),
      );
      expect(result.position).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('devrait mettre à jour le poste existant', async () => {
      const dto: UpdateRecruitmentDto = { description: 'Description modifiée' };
      const updatedPost = { ...mockPost, description: 'Description modifiée' };

      prismaMock.recruitmentPost.findUnique.mockResolvedValue(mockPost);
      prismaMock.recruitmentPost.update.mockResolvedValue(updatedPost);

      const result = await service.update(1, dto);

      expect(result.description).toBe('Description modifiée');
    });

    it('devrait régénérer le slug si le titre change sans slug fourni', async () => {
      const dto: UpdateRecruitmentDto = { title: 'Nouveau Titre' };

      // findOne interne → trouver le poste
      prismaMock.recruitmentPost.findUnique
        .mockResolvedValueOnce(mockPost) // findOne dans update
        .mockResolvedValueOnce(null); // generateUniqueSlug → slug libre

      prismaMock.recruitmentPost.update.mockResolvedValue({
        ...mockPost,
        title: 'Nouveau Titre',
        slug: 'nouveau-titre',
      });

      const result = await service.update(1, dto);

      expect(prismaMock.recruitmentPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'nouveau-titre' }),
        }),
      );
      expect(result.slug).toBe('nouveau-titre');
    });

    it('devrait lever NotFoundException si le poste est introuvable', async () => {
      prismaMock.recruitmentPost.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { description: 'Test' })).rejects.toThrow(NotFoundException);
    });

    it('devrait lever NotFoundException sur erreur Prisma P2025', async () => {
      prismaMock.recruitmentPost.findUnique.mockResolvedValue(mockPost);

      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '6.0.0',
      });
      prismaMock.recruitmentPost.update.mockRejectedValue(prismaError);

      await expect(service.update(1, { title: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('devrait supprimer le poste et retourner un message de succès', async () => {
      prismaMock.recruitmentPost.delete.mockResolvedValue(mockPost);

      const result = await service.delete(1);

      expect(result).toEqual({ message: 'Poste de recrutement supprimé avec succès' });
      expect(prismaMock.recruitmentPost.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('devrait lever NotFoundException si le poste est introuvable (P2025)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '6.0.0',
      });
      prismaMock.recruitmentPost.delete.mockRejectedValue(prismaError);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });

    it('devrait relancer une erreur inconnue telle quelle', async () => {
      const unknownError = new Error('Connexion perdue');
      prismaMock.recruitmentPost.delete.mockRejectedValue(unknownError);

      await expect(service.delete(1)).rejects.toThrow('Connexion perdue');
    });
  });

  // ---------------------------------------------------------------------------
  // toggleActive
  // ---------------------------------------------------------------------------
  describe('toggleActive', () => {
    it("devrait basculer l'état actif du poste", async () => {
      prismaMock.recruitmentPost.findUnique.mockResolvedValue(mockPost);
      prismaMock.recruitmentPost.update.mockResolvedValue({ ...mockPost, active: false });

      const result = await service.toggleActive(1);

      expect(prismaMock.recruitmentPost.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
      expect(result.active).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // reorder
  // ---------------------------------------------------------------------------
  describe('reorder', () => {
    it('devrait réordonner les postes via une transaction', async () => {
      prismaMock.$transaction.mockResolvedValue([]);
      // Les appels update dans la transaction sont mockés ici via $transaction
      prismaMock.recruitmentPost.update.mockResolvedValue(mockPost);

      const result = await service.reorder({
        items: [
          { id: 1, position: 0 },
          { id: 2, position: 1 },
        ],
      });

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Ordre des postes mis à jour avec succès' });
    });
  });
});
