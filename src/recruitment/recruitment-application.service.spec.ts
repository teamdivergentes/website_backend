import { Test, TestingModule } from '@nestjs/testing';
import { RecruitmentApplicationService } from './recruitment-application.service';
import { ApplicationNotifierService } from './services/application-notifier.service';
import { ApplyRecruitmentDto } from './dto/apply-recruitment.dto';

describe('RecruitmentApplicationService', () => {
  let service: RecruitmentApplicationService;

  const mockNotifier = {
    sendEmail: jest.fn(),
    sendDiscordWebhook: jest.fn(),
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
          provide: ApplicationNotifierService,
          useValue: mockNotifier,
        },
      ],
    }).compile();

    service = module.get<RecruitmentApplicationService>(RecruitmentApplicationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendApplication', () => {
    it('retourne success quand email et Discord réussissent', async () => {
      mockNotifier.sendEmail.mockResolvedValue(undefined);
      mockNotifier.sendDiscordWebhook.mockResolvedValue(undefined);

      const result = await service.sendApplication(mockDto, mockFile);

      expect(result.success).toBe(true);
      expect(result.message).toContain('bien été envoyée');
      expect(mockNotifier.sendEmail).toHaveBeenCalledWith(mockDto, mockFile, undefined);
      expect(mockNotifier.sendDiscordWebhook).toHaveBeenCalledWith(mockDto, mockFile, undefined);
    });

    it('retourne success quand seul email réussit', async () => {
      mockNotifier.sendEmail.mockResolvedValue(undefined);
      mockNotifier.sendDiscordWebhook.mockRejectedValue(new Error('webhook failed'));

      const result = await service.sendApplication(mockDto);

      expect(result.success).toBe(true);
    });

    it('retourne success quand seul Discord réussit', async () => {
      mockNotifier.sendEmail.mockRejectedValue(new Error('smtp failed'));
      mockNotifier.sendDiscordWebhook.mockResolvedValue(undefined);

      const result = await service.sendApplication(mockDto);

      expect(result.success).toBe(true);
    });

    it('retourne failure quand les deux canaux échouent', async () => {
      mockNotifier.sendEmail.mockRejectedValue(new Error('smtp failed'));
      mockNotifier.sendDiscordWebhook.mockRejectedValue(new Error('webhook failed'));

      const result = await service.sendApplication(mockDto);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Erreur');
    });

    it('gère une candidature sans CV', async () => {
      mockNotifier.sendEmail.mockResolvedValue(undefined);
      mockNotifier.sendDiscordWebhook.mockResolvedValue(undefined);

      const result = await service.sendApplication(mockDto);

      expect(result.success).toBe(true);
      expect(mockNotifier.sendEmail).toHaveBeenCalledWith(mockDto, undefined, undefined);
    });
  });
});
