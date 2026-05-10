import { Test, TestingModule } from '@nestjs/testing';
import { ContactService } from './contact.service';
import { ConfigService } from '../config/config.service';
import { ContactDto } from './dto/contact.dto';
import * as nodemailer from 'nodemailer';

// Mock nodemailer au niveau module
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('ContactService', () => {
  let service: ContactService;

  const mockConfigService = {
    getValue: jest.fn(),
  };

  const mockSendMail = jest.fn();
  const mockTransporter = { sendMail: mockSendMail };

  const sampleDto: ContactDto = {
    subject: 'Test sujet',
    name: 'Jean Dupont',
    email: 'jean@example.com',
    message: 'Bonjour, ceci est un message de test suffisamment long.',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<ContactService>(ContactService);

    // Par défaut, createTransport retourne un transporter mocké
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Réinitialiser fetch avant chaque test pour éviter la pollution entre tests
    (global as Record<string, unknown>).fetch = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Réinitialiser le fetch global entre les tests pour éviter la pollution
    (global as Record<string, unknown>).fetch = undefined;
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // sendContact — succès email + discord
  // -------------------------------------------------------------------------
  describe('sendContact', () => {
    it('devrait retourner success=true si email et discord réussissent', async () => {
      // Config SMTP complète
      mockConfigService.getValue.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: 'user@example.com',
          contact_smtp_pass: 'secret',
          contact_email: 'contact@example.com',
          contact_discord_webhook: 'https://discord.com/api/webhooks/test',
        };
        return Promise.resolve(config[key] ?? null);
      });

      mockSendMail.mockResolvedValue({ messageId: 'ok' });

      // Mock fetch global pour Discord
      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const result = await service.sendContact(sampleDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('bien été envoyé');
    });

    it("devrait retourner success=true si seulement l'email réussit (Discord échoue)", async () => {
      mockConfigService.getValue.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: 'user@example.com',
          contact_smtp_pass: 'secret',
          contact_email: 'contact@example.com',
          contact_discord_webhook: 'https://discord.com/api/webhooks/test',
        };
        return Promise.resolve(config[key] ?? null);
      });

      mockSendMail.mockResolvedValue({ messageId: 'ok' });

      // Discord retourne une réponse non-ok
      const mockFetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
      global.fetch = mockFetch;

      const result = await service.sendContact(sampleDto);

      expect(result.success).toBe(true);
    });

    it('devrait retourner success=true si seulement discord réussit (email échoue)', async () => {
      mockConfigService.getValue.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: 'user@example.com',
          contact_smtp_pass: 'secret',
          contact_email: '',
          contact_discord_webhook: 'https://discord.com/api/webhooks/test',
        };
        return Promise.resolve(config[key] ?? null);
      });

      mockSendMail.mockRejectedValue(new Error('SMTP error'));

      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const result = await service.sendContact(sampleDto);

      expect(result.success).toBe(true);
    });

    it('devrait retourner success=false si email et discord échouent tous les deux', async () => {
      mockConfigService.getValue.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: 'user@example.com',
          contact_smtp_pass: 'secret',
          contact_discord_webhook: 'https://discord.com/api/webhooks/test',
        };
        return Promise.resolve(config[key] ?? null);
      });

      mockSendMail.mockRejectedValue(new Error('SMTP connexion refusée'));

      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const result = await service.sendContact(sampleDto);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Erreur');
    });

    it('devrait passer le port 465 avec secure=true', async () => {
      mockConfigService.getValue.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '465',
          contact_smtp_user: 'user@example.com',
          contact_smtp_pass: 'secret',
          contact_email: 'contact@example.com',
          contact_discord_webhook: '',
        };
        return Promise.resolve(config[key] ?? null);
      });

      mockSendMail.mockResolvedValue({});

      await service.sendContact(sampleDto);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 465, secure: true }),
      );
    });

    it('devrait utiliser smtpUser comme destinataire si contact_email est absent', async () => {
      mockConfigService.getValue.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: 'fallback@example.com',
          contact_smtp_pass: 'secret',
          contact_discord_webhook: '',
        };
        return Promise.resolve(config[key] ?? null);
      });

      mockSendMail.mockResolvedValue({});

      await service.sendContact(sampleDto);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'fallback@example.com' }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // sendEmail — config SMTP manquante (skip silencieux)
  // -------------------------------------------------------------------------
  describe('sendEmail (config absente)', () => {
    it("ne devrait pas tenter d'envoyer l'email si smtpHost est absent", async () => {
      // Quand smtpHost est absent, sendEmail fait un return silencieux (pas d'erreur).
      // sendDiscordWebhook avec webhookUrl=null fait de même → return silencieux.
      // Les deux canaux terminent sans erreur mais sans envoyer → results.discord=true, results.email=false
      // Le service considère que discord a "réussi" (skip sans erreur) → success=true.
      // On vérifie seulement que nodemailer n'est pas appelé.
      mockConfigService.getValue.mockImplementation(() => Promise.resolve(null));

      const result = await service.sendContact(sampleDto);

      expect(nodemailer.createTransport).not.toHaveBeenCalled();
      // Le canal Discord est skippé silencieusement (pas d'erreur) → success=true
      expect(result.success).toBe(true);
    });

    it("ne devrait pas tenter d'envoyer l'email si smtpUser est absent", async () => {
      mockConfigService.getValue.mockImplementation((key: string) => {
        const config: Record<string, string | null> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: null,
          contact_smtp_pass: 'secret',
          contact_discord_webhook: null,
        };
        return Promise.resolve(config[key] ?? null);
      });

      await service.sendContact(sampleDto);

      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // sendDiscordWebhook — webhook absent (skip silencieux)
  // -------------------------------------------------------------------------
  describe('sendDiscordWebhook (webhook absent)', () => {
    it("ne devrait pas appeler fetch si le webhook Discord n'est pas configuré", async () => {
      mockConfigService.getValue.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: 'user@example.com',
          contact_smtp_pass: 'secret',
          contact_email: 'contact@example.com',
          contact_discord_webhook: '',
        };
        return Promise.resolve(config[key] ?? null);
      });

      mockSendMail.mockResolvedValue({});

      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      await service.sendContact(sampleDto);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // sendDiscordWebhook — message long (troncature)
  // -------------------------------------------------------------------------
  describe('sendDiscordWebhook (message long)', () => {
    it('devrait tronquer le message à 1024 caractères pour Discord', async () => {
      const longMessage = 'A'.repeat(1100);
      const dto: ContactDto = { ...sampleDto, message: longMessage };

      mockConfigService.getValue.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: 'user@example.com',
          contact_smtp_pass: 'secret',
          contact_email: 'contact@example.com',
          contact_discord_webhook: 'https://discord.com/api/webhooks/test',
        };
        return Promise.resolve(config[key] ?? null);
      });

      mockSendMail.mockResolvedValue({});

      let capturedBody: { embeds?: { fields?: { name: string; value: string }[] }[] } = {};
      const mockFetch = jest.fn().mockImplementation((_url: string, opts: { body: string }) => {
        capturedBody = JSON.parse(opts.body) as typeof capturedBody;
        return Promise.resolve({ ok: true });
      });
      global.fetch = mockFetch;

      await service.sendContact(dto);

      const messageField = capturedBody.embeds?.[0]?.fields?.find(
        (f: { name: string; value: string }) => f.name === 'Message',
      );
      expect(messageField).toBeDefined();
      expect((messageField?.value ?? '').length).toBeLessThanOrEqual(1024);
      expect(messageField?.value).toMatch(/\.\.\.$/);
    });

    it('ne devrait pas tronquer un message court pour Discord', async () => {
      mockConfigService.getValue.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: 'user@example.com',
          contact_smtp_pass: 'secret',
          contact_email: 'contact@example.com',
          contact_discord_webhook: 'https://discord.com/api/webhooks/test',
        };
        return Promise.resolve(config[key] ?? null);
      });

      mockSendMail.mockResolvedValue({});

      let capturedBody: { embeds?: { fields?: { name: string; value: string }[] }[] } = {};
      const mockFetch = jest.fn().mockImplementation((_url: string, opts: { body: string }) => {
        capturedBody = JSON.parse(opts.body) as typeof capturedBody;
        return Promise.resolve({ ok: true });
      });
      global.fetch = mockFetch;

      await service.sendContact(sampleDto);

      const messageField = capturedBody.embeds?.[0]?.fields?.find(
        (f: { name: string; value: string }) => f.name === 'Message',
      );
      expect(messageField?.value).toBe(sampleDto.message);
    });
  });

  // -------------------------------------------------------------------------
  // buildEmailHtml — escapeHtml
  // -------------------------------------------------------------------------
  describe('email HTML (escapeHtml via sendEmail)', () => {
    it('devrait échapper les caractères HTML dans les champs du formulaire', async () => {
      const maliciousDto: ContactDto = {
        subject: '<script>alert("xss")</script>',
        name: 'Jean & Marie',
        email: 'test@example.com',
        message: '<b>Message</b> avec "guillemets" et apostrophe\'s',
      };

      mockConfigService.getValue.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: 'user@example.com',
          contact_smtp_pass: 'secret',
          contact_email: 'contact@example.com',
          contact_discord_webhook: '',
        };
        return Promise.resolve(config[key] ?? null);
      });

      let capturedHtml = '';
      mockSendMail.mockImplementation((opts: { html: string }) => {
        capturedHtml = opts.html;
        return Promise.resolve({});
      });

      await service.sendContact(maliciousDto);

      expect(capturedHtml).not.toContain('<script>');
      expect(capturedHtml).toContain('&lt;script&gt;');
      expect(capturedHtml).toContain('Jean &amp; Marie');
    });
  });
});
