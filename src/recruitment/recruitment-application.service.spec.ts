import { Test, TestingModule } from '@nestjs/testing';
import { RecruitmentApplicationService } from './recruitment-application.service';
import { ConfigService } from '../config/config.service';
import { ApplyRecruitmentDto } from './dto/apply-recruitment.dto';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
  })),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('RecruitmentApplicationService', () => {
  let service: RecruitmentApplicationService;

  const mockConfigService = {
    getValue: jest.fn(),
  };

  const mockDto: ApplyRecruitmentDto = {
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Je suis très intéressé par ce poste.',
    postTitle: 'Développeur Full Stack',
    postType: 'CDI',
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'cv',
    originalname: 'cv-john-doe.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('fake-pdf-content'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruitmentApplicationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RecruitmentApplicationService>(RecruitmentApplicationService);

    // Reset all mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendApplication', () => {
    it('should return success when both email and discord succeed', async () => {
      // Mock config service
      mockConfigService.getValue.mockImplementation((key: string) => {
        const configs: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: 'no-reply@dvg.com',
          contact_smtp_pass: 'password123',
          contact_email: 'recrutement@dvg.com',
          contact_discord_webhook: 'https://discord.com/api/webhooks/123/abc',
        };
        return Promise.resolve(configs[key] || null);
      });

      // Mock fetch for Discord webhook
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await service.sendApplication(mockDto, mockFile);

      expect(result.success).toBe(true);
      expect(result.message).toContain('bien été envoyée');
      expect(mockConfigService.getValue).toHaveBeenCalled();
    });

    it('should return success when only email succeeds', async () => {
      mockConfigService.getValue.mockImplementation((key: string) => {
        const configs: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: 'no-reply@dvg.com',
          contact_smtp_pass: 'password123',
          contact_email: 'recrutement@dvg.com',
        };
        return Promise.resolve(configs[key] || null);
      });

      const result = await service.sendApplication(mockDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('bien été envoyée');
    });

    it('should return success when only discord succeeds', async () => {
      mockConfigService.getValue.mockImplementation((key: string) => {
        if (key === 'contact_discord_webhook') {
          return Promise.resolve('https://discord.com/api/webhooks/123/abc');
        }
        return Promise.resolve(null);
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await service.sendApplication(mockDto);

      expect(result.success).toBe(true);
    });

    it('should handle application without CV file', async () => {
      mockConfigService.getValue.mockImplementation((key: string) => {
        const configs: Record<string, string> = {
          contact_smtp_host: 'smtp.example.com',
          contact_smtp_port: '587',
          contact_smtp_user: 'no-reply@dvg.com',
          contact_smtp_pass: 'password123',
        };
        return Promise.resolve(configs[key] || null);
      });

      const result = await service.sendApplication(mockDto);

      expect(result.success).toBe(true);
    });
  });

  describe('buildEmailHtml', () => {
    it('should include CV file info when file is provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const html = (service as any).buildEmailHtml(mockDto, mockFile);

      expect(html).toContain(mockDto.postTitle);
      expect(html).toContain(mockDto.postType);
      expect(html).toContain(mockDto.name);
      expect(html).toContain(mockDto.email);
      expect(html).toContain('cv-badge cv-yes');
      expect(html).toContain(mockFile.originalname);
    });

    it('should show no CV when file is not provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const html = (service as any).buildEmailHtml(mockDto);

      expect(html).toContain('cv-badge cv-no');
      expect(html).toContain('Non fourni');
    });
  });

  describe('buildEmailText', () => {
    it('should format text email correctly with file', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const text = (service as any).buildEmailText(mockDto, mockFile);

      expect(text).toContain('Nouvelle candidature DVG');
      expect(text).toContain(`Poste: ${mockDto.postTitle}`);
      expect(text).toContain(`Type de contrat: ${mockDto.postType}`);
      expect(text).toContain(`Nom: ${mockDto.name}`);
      expect(text).toContain(`Email: ${mockDto.email}`);
      expect(text).toContain('Fichier joint');
      expect(text).toContain(mockFile.originalname);
    });

    it('should show no CV in text when file is not provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const text = (service as any).buildEmailText(mockDto);

      expect(text).toContain('CV: Non fourni');
    });
  });
});
