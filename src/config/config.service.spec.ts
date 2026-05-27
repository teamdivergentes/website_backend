import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from './config.service';
import { PrismaService } from '../prisma.service';
import { createPrismaMock, PrismaMock } from '../../test/helpers/prisma-mock';
import { CreateConfigDto, UpdateConfigDto } from './dto/update-config.dto';

describe('ConfigService', () => {
  let service: ConfigService;
  let prismaMock: PrismaMock;

  const mockConfig = {
    id: 1,
    key: 'site_name',
    value: 'Team Divergentes',
    description: 'Nom du site',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // findAll (admin — toutes les clés)
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('devrait retourner la liste de toutes les configurations', async () => {
      const configs = [mockConfig, { ...mockConfig, id: 2, key: 'site_logo' }];
      prismaMock.config.findMany.mockResolvedValue(configs);

      const result = await service.findAll();

      expect(result).toEqual(configs);
      expect(prismaMock.config.findMany).toHaveBeenCalledWith({
        orderBy: { key: 'asc' },
        take: 200,
      });
    });

    it('devrait retourner un tableau vide si aucune config', async () => {
      prismaMock.config.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findAllPublic — seules les clés de l'allow-list
  // ---------------------------------------------------------------------------
  describe('findAllPublic', () => {
    const smtpConfig = {
      id: 10,
      key: 'contact_smtp_pass',
      value: 'secret',
      description: 'Mot de passe SMTP',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const webhookConfig = {
      id: 11,
      key: 'contact_discord_webhook',
      value: 'https://discord.com/api/webhooks/xxx',
      description: 'Webhook',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const pageVisibleConfig = {
      id: 12,
      key: 'page_shop_visible',
      value: 'true',
      description: 'Page shop visible',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('devrait retourner uniquement les clés publiques', async () => {
      prismaMock.config.findMany.mockResolvedValue([
        mockConfig,
        smtpConfig,
        webhookConfig,
        pageVisibleConfig,
      ]);

      const result = await service.findAllPublic();

      const keys = result.map((c) => c.key);
      expect(keys).toContain('site_name');
      expect(keys).toContain('page_shop_visible');
      expect(keys).not.toContain('contact_smtp_pass');
      expect(keys).not.toContain('contact_discord_webhook');
    });

    it('devrait retourner un tableau vide si aucune config publique', async () => {
      prismaMock.config.findMany.mockResolvedValue([smtpConfig, webhookConfig]);

      const result = await service.findAllPublic();

      expect(result).toEqual([]);
    });

    it('devrait inclure les clés page_*_visible (pattern)', async () => {
      const configs = [
        { ...pageVisibleConfig, key: 'page_contact_visible' },
        { ...pageVisibleConfig, key: 'page_twitch_visible' },
        smtpConfig,
      ];
      prismaMock.config.findMany.mockResolvedValue(configs);

      const result = await service.findAllPublic();

      const keys = result.map((c) => c.key);
      expect(keys).toContain('page_contact_visible');
      expect(keys).toContain('page_twitch_visible');
      expect(keys).not.toContain('contact_smtp_pass');
    });
  });

  // ---------------------------------------------------------------------------
  // findOnePublic — 404 pour clés privées (ne révèle pas l'existence)
  // ---------------------------------------------------------------------------
  describe('findOnePublic', () => {
    it('devrait retourner la config si la clé est publique', async () => {
      prismaMock.config.findUnique.mockResolvedValue(mockConfig);

      const result = await service.findOnePublic('site_name');

      expect(result).toEqual(mockConfig);
    });

    it('doit lever NotFoundException si la clé est SMTP (même si elle existe en base)', async () => {
      // Simuler que la clé existe en base, mais elle est privée
      prismaMock.config.findUnique.mockResolvedValue({
        id: 10,
        key: 'contact_smtp_pass',
        value: 'secret',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.findOnePublic('contact_smtp_pass')).rejects.toThrow(NotFoundException);
    });

    it('doit lever NotFoundException si la clé est un webhook (même si elle existe en base)', async () => {
      prismaMock.config.findUnique.mockResolvedValue({
        id: 11,
        key: 'contact_discord_webhook',
        value: 'https://discord.com/api/webhooks/xxx',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.findOnePublic('contact_discord_webhook')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('doit lever NotFoundException si la clé est publique mais introuvable en base', async () => {
      prismaMock.config.findUnique.mockResolvedValue(null);

      await expect(service.findOnePublic('site_name')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('devrait retourner la config correspondant à la clé', async () => {
      prismaMock.config.findUnique.mockResolvedValue(mockConfig);

      const result = await service.findOne('site_name');

      expect(result).toEqual(mockConfig);
      expect(prismaMock.config.findUnique).toHaveBeenCalledWith({
        where: { key: 'site_name' },
      });
    });

    it('devrait lever NotFoundException si la clé est absente', async () => {
      prismaMock.config.findUnique.mockResolvedValue(null);

      await expect(service.findOne('clé_inexistante')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // getValue
  // ---------------------------------------------------------------------------
  describe('getValue', () => {
    it('devrait retourner la valeur si la config existe', async () => {
      prismaMock.config.findUnique.mockResolvedValue(mockConfig);

      const result = await service.getValue('site_name');

      expect(result).toBe('Team Divergentes');
    });

    it('devrait retourner null si la config est absente', async () => {
      prismaMock.config.findUnique.mockResolvedValue(null);

      const result = await service.getValue('inexistant');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('devrait créer et retourner une nouvelle config', async () => {
      const dto: CreateConfigDto = {
        key: 'new_key',
        value: 'new_value',
        description: 'Description',
      };
      prismaMock.config.create.mockResolvedValue({ ...mockConfig, key: dto.key, value: dto.value });

      const result = await service.create(dto);

      expect(result.key).toBe(dto.key);
      expect(prismaMock.config.create).toHaveBeenCalledWith({
        data: {
          key: dto.key,
          value: dto.value,
          description: dto.description,
        },
      });
    });

    it('devrait lever ConflictException si la clé est déjà utilisée (P2002)', async () => {
      const dto: CreateConfigDto = { key: 'site_name', value: 'valeur' };
      const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      prismaMock.config.create.mockRejectedValue(prismaError);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('devrait relancer une erreur inconnue telle quelle', async () => {
      const dto: CreateConfigDto = { key: 'key', value: 'val' };
      const unknownError = new Error('Erreur réseau');
      prismaMock.config.create.mockRejectedValue(unknownError);

      await expect(service.create(dto)).rejects.toThrow('Erreur réseau');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('devrait mettre à jour la config (upsert)', async () => {
      const dto: UpdateConfigDto = { value: 'nouvelle_valeur', description: 'Nouvelle desc' };
      const updatedConfig = { ...mockConfig, value: dto.value };
      prismaMock.config.upsert.mockResolvedValue(updatedConfig);

      const result = await service.update('site_name', dto);

      expect(result.value).toBe('nouvelle_valeur');
      expect(prismaMock.config.upsert).toHaveBeenCalledWith({
        where: { key: 'site_name' },
        update: { value: dto.value, description: dto.description },
        create: { key: 'site_name', value: dto.value, description: dto.description },
      });
    });

    it("devrait créer la config si elle n'existe pas encore (upsert)", async () => {
      const dto: UpdateConfigDto = { value: 'valeur' };
      const newConfig = { ...mockConfig, key: 'nouvelle_cle', value: dto.value };
      prismaMock.config.upsert.mockResolvedValue(newConfig);

      const result = await service.update('nouvelle_cle', dto);

      expect(result.key).toBe('nouvelle_cle');
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('devrait supprimer une config existante', async () => {
      prismaMock.config.delete.mockResolvedValue(mockConfig);

      await service.delete('site_name');

      expect(prismaMock.config.delete).toHaveBeenCalledWith({
        where: { key: 'site_name' },
      });
    });

    it('devrait lever NotFoundException si la config est introuvable (P2025)', async () => {
      const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
      prismaMock.config.delete.mockRejectedValue(prismaError);

      await expect(service.delete('clé_inexistante')).rejects.toThrow(NotFoundException);
    });

    it('devrait relancer une erreur inconnue telle quelle', async () => {
      const unknownError = new Error('Connexion perdue');
      prismaMock.config.delete.mockRejectedValue(unknownError);

      await expect(service.delete('site_name')).rejects.toThrow('Connexion perdue');
    });
  });
});
