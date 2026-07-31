import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { isPublicConfigKey } from './public-config-keys';

// ---------------------------------------------------------------------------
// Mock ConfigService
// ---------------------------------------------------------------------------
const mockConfigService = {
  findAllPublic: jest.fn(),
  findOnePublic: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Données de test
const publicConfig = {
  id: 1,
  key: 'site_name',
  value: 'Team Divergentes',
  description: 'Nom du site',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sensitiveConfig = {
  id: 2,
  key: 'contact_smtp_pass',
  value: 'super_secret_password',
  description: 'Mot de passe SMTP',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const webhookConfig = {
  id: 3,
  key: 'contact_discord_webhook',
  value: 'https://discord.com/api/webhooks/xxx/yyy',
  description: 'Webhook Discord',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ConfigController', () => {
  let controller: ConfigController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigController],
      providers: [{ provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    controller = module.get<ConfigController>(ConfigController);
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // GET /api/config (public) — findAll filtré
  // ---------------------------------------------------------------------------
  describe('findAll() - endpoint public', () => {
    it('devrait retourner uniquement les clés publiques', async () => {
      mockConfigService.findAllPublic.mockResolvedValue([publicConfig]);

      const result = await controller.findAll();

      expect(result).toEqual([publicConfig]);
      expect(mockConfigService.findAllPublic).toHaveBeenCalledTimes(1);
    });

    it('ne doit pas exposer les clés sensibles (SMTP, webhook)', async () => {
      mockConfigService.findAllPublic.mockResolvedValue([publicConfig]);

      const result = await controller.findAll();

      const keys = result.map((c: { key: string }) => c.key);
      expect(keys).not.toContain('contact_smtp_pass');
      expect(keys).not.toContain('contact_discord_webhook');
      expect(keys).not.toContain('recruitment_discord_webhook');
    });

    it('devrait retourner les clés page_*_visible', async () => {
      const visibilityConfig = { ...publicConfig, key: 'page_shop_visible', value: 'true' };
      mockConfigService.findAllPublic.mockResolvedValue([visibilityConfig]);

      const result = await controller.findAll();

      expect(result).toEqual([visibilityConfig]);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/config/:key (public) — findOne filtré
  // ---------------------------------------------------------------------------
  describe('findOnePublic() - endpoint public', () => {
    it('devrait retourner une clé publique existante', async () => {
      mockConfigService.findOnePublic.mockResolvedValue(publicConfig);

      const result = await controller.findOnePublic('site_name');

      expect(result).toEqual(publicConfig);
      expect(mockConfigService.findOnePublic).toHaveBeenCalledWith('site_name');
    });

    it('doit retourner 404 pour une clé SMTP (ne pas révéler son existence)', async () => {
      mockConfigService.findOnePublic.mockRejectedValue(
        new NotFoundException('Configuration "contact_smtp_pass" non trouvée'),
      );

      await expect(controller.findOnePublic('contact_smtp_pass')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('doit retourner 404 pour un webhook (ne pas révéler son existence)', async () => {
      mockConfigService.findOnePublic.mockRejectedValue(
        new NotFoundException('Configuration "contact_discord_webhook" non trouvée'),
      );

      await expect(controller.findOnePublic('contact_discord_webhook')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('doit retourner 404 pour une clé privée inexistante', async () => {
      mockConfigService.findOnePublic.mockRejectedValue(
        new NotFoundException('Configuration "clé_privée" non trouvée'),
      );

      await expect(controller.findOnePublic('clé_privée')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/config/admin/all — endpoint admin protégé
  // ---------------------------------------------------------------------------
  describe('findAllAdmin() - endpoint admin', () => {
    it('devrait retourner toutes les clés (y compris sensibles) pour un admin', async () => {
      const allConfigs = [publicConfig, sensitiveConfig, webhookConfig];
      mockConfigService.findAll.mockResolvedValue(allConfigs);

      const result = await controller.findAllAdmin();

      expect(result).toEqual(allConfigs);
      expect(mockConfigService.findAll).toHaveBeenCalledTimes(1);
    });

    it('devrait inclure les clés SMTP et webhook pour un admin', async () => {
      const allConfigs = [publicConfig, sensitiveConfig, webhookConfig];
      mockConfigService.findAll.mockResolvedValue(allConfigs);

      const result = await controller.findAllAdmin();

      const keys = result.map((c: { key: string }) => c.key);
      expect(keys).toContain('contact_smtp_pass');
      expect(keys).toContain('contact_discord_webhook');
    });
  });
});

// ---------------------------------------------------------------------------
// Tests unitaires pour isPublicConfigKey (helper)
// ---------------------------------------------------------------------------
describe('isPublicConfigKey (helper)', () => {
  it('doit retourner true pour site_name', () => {
    expect(isPublicConfigKey('site_name')).toBe(true);
  });

  it('doit retourner true pour og_title', () => {
    expect(isPublicConfigKey('og_title')).toBe(true);
  });

  it('doit retourner true pour page_shop_visible (pattern page_*_visible)', () => {
    expect(isPublicConfigKey('page_shop_visible')).toBe(true);
  });

  it('doit retourner true pour page_twitch_visible', () => {
    expect(isPublicConfigKey('page_twitch_visible')).toBe(true);
  });

  it('doit retourner true pour tiktok_url', () => {
    expect(isPublicConfigKey('tiktok_url')).toBe(true);
  });

  it('doit retourner false pour contact_smtp_pass', () => {
    expect(isPublicConfigKey('contact_smtp_pass')).toBe(false);
  });

  it('doit retourner false pour contact_smtp_user', () => {
    expect(isPublicConfigKey('contact_smtp_user')).toBe(false);
  });

  it('doit retourner false pour contact_smtp_host', () => {
    expect(isPublicConfigKey('contact_smtp_host')).toBe(false);
  });

  it('doit retourner false pour contact_smtp_port', () => {
    expect(isPublicConfigKey('contact_smtp_port')).toBe(false);
  });

  it('doit retourner false pour contact_discord_webhook', () => {
    expect(isPublicConfigKey('contact_discord_webhook')).toBe(false);
  });

  it('doit retourner false pour recruitment_discord_webhook', () => {
    expect(isPublicConfigKey('recruitment_discord_webhook')).toBe(false);
  });

  it('doit retourner false pour une clé inconnue', () => {
    expect(isPublicConfigKey('clé_inconnue')).toBe(false);
  });

  it('doit retourner false pour une clé avec webhook dans le nom', () => {
    expect(isPublicConfigKey('some_webhook_url')).toBe(false);
  });
});
