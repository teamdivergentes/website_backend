import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import { ShopNotifierService } from './shop-notifier.service';
import { ShopSettingsService } from './shop-settings.service';
import { ConfigService } from '../config/config.service';
import {
  buildOrderDiscordEmbed,
  buildOrderEmailHtml,
  buildOrderEmailText,
  formatAddress,
  formatEuros,
} from './shop-notifier.service';

// Mock nodemailer au niveau module
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

const order = {
  id: 1,
  reference: 'DVG-2026-0042',
  subtotalCents: 10980,
  shippingCents: 590,
  totalCents: 11570,
  customerEmail: 'client@example.com',
  customerName: 'Jean Dupont',
  shippingAddress: {
    name: 'Jean Dupont',
    address: { line1: '1 rue du Test', postal_code: '75001', city: 'Paris', country: 'FR' },
  },
  items: [
    {
      productName: 'Maillot 2026 — DVG × Joker',
      size: 'M',
      flockingText: 'Snake',
      quantity: 2,
      unitPriceCents: 4990,
      flockingFeeCents: 500,
      lineTotalCents: 10980,
    },
  ],
} as never;

describe('shop-notifier helpers', () => {
  describe('formatEuros', () => {
    it('convertit les centimes en euros avec deux décimales', () => {
      expect(formatEuros(3990)).toBe('39.90');
      expect(formatEuros(1750)).toBe('17.50');
      expect(formatEuros(0)).toBe('0.00');
    });
  });

  describe('formatAddress', () => {
    it('assemble les composants de l’adresse sur une ligne', () => {
      expect(formatAddress(order.shippingAddress)).toBe('1 rue du Test, 75001 Paris, FR');
    });

    it('retourne un libellé explicite si l’adresse est absente', () => {
      expect(formatAddress(null)).toBe('Adresse non renseignée');
      expect(formatAddress({})).toBe('Adresse non renseignée');
    });
  });

  describe('buildOrderEmailText', () => {
    it('contient la référence, l’article, la taille et le total', () => {
      const text = buildOrderEmailText(order);
      expect(text).toContain('DVG-2026-0042');
      expect(text).toContain('Maillot 2026 — DVG × Joker');
      expect(text).toContain('taille M');
      expect(text).toContain('115.70');
    });

    it('fait apparaître le flocage, information recopiée pour le fabricant', () => {
      expect(buildOrderEmailText(order)).toContain('flocage « Snake »');
    });

    it('indique explicitement l’absence de flocage', () => {
      const sansFlocage = {
        ...(order as object),
        items: [{ productName: 'Maillot', size: 'L', flockingText: null, quantity: 1 }],
      } as never;
      expect(buildOrderEmailText(sansFlocage)).toContain('sans flocage');
    });
  });

  describe('buildOrderEmailHtml', () => {
    it('échappe le HTML présent dans les données client', () => {
      const hostile = { ...(order as object), customerName: '<script>alert(1)</script>' } as never;
      const html = buildOrderEmailHtml(hostile);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('échappe le flocage, qui est une saisie client', () => {
      const hostile = {
        ...(order as object),
        items: [
          { productName: '<img src=x onerror=1>', size: 'M', flockingText: null, quantity: 1 },
        ],
      } as never;
      const html = buildOrderEmailHtml(hostile);
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });
  });

  describe('buildOrderDiscordEmbed', () => {
    it('construit un embed avec le titre et les champs attendus', () => {
      const embed = buildOrderDiscordEmbed(order);
      expect(embed.title).toContain('DVG-2026-0042');
      expect(embed.color).toBe(0x32d299);
      const names = embed.fields.map((f) => f.name);
      expect(names).toEqual(
        expect.arrayContaining(['Articles', 'Client', 'Total', 'Adresse de livraison']),
      );
    });
  });
});

describe('ShopNotifierService.notifyNewOrder', () => {
  let service: ShopNotifierService;

  const mockConfigService = {
    getValue: jest.fn(),
  };

  const mockSettingsService = {
    get: jest.fn().mockResolvedValue({ ordersNotifyEmail: 'boutique@example.com' }),
  };

  const mockSendMail = jest.fn();
  const mockTransporter = { sendMail: mockSendMail };

  const smtpConfig: Record<string, string> = {
    contact_smtp_host: 'smtp.example.com',
    contact_smtp_port: '587',
    contact_smtp_user: 'user@example.com',
    contact_smtp_pass: 'secret',
    shop_team_email: 'boutique@example.com',
    shop_discord_webhook: 'https://discord.com/api/webhooks/test',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopNotifierService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ShopSettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<ShopNotifierService>(ShopNotifierService);

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
    (global as Record<string, unknown>).fetch = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
    (global as Record<string, unknown>).fetch = undefined;
  });

  it('ne rejette pas si le mail échoue mais Discord réussit', async () => {
    mockConfigService.getValue.mockImplementation((key: string) =>
      Promise.resolve(smtpConfig[key] ?? null),
    );
    mockSendMail.mockRejectedValue(new Error('SMTP down'));
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    await expect(service.notifyNewOrder(order)).resolves.toBeUndefined();
  });

  it('ne rejette pas si Discord échoue mais le mail réussit', async () => {
    mockConfigService.getValue.mockImplementation((key: string) =>
      Promise.resolve(smtpConfig[key] ?? null),
    );
    mockSendMail.mockResolvedValue({ messageId: 'ok' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(service.notifyNewOrder(order)).resolves.toBeUndefined();
  });

  it('rejette si le mail et Discord échouent tous les deux', async () => {
    mockConfigService.getValue.mockImplementation((key: string) =>
      Promise.resolve(smtpConfig[key] ?? null),
    );
    mockSendMail.mockRejectedValue(new Error('SMTP down'));
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(service.notifyNewOrder(order)).rejects.toThrow(
      `Aucune notification envoyee pour la commande ${order.reference}`,
    );
  });
});
