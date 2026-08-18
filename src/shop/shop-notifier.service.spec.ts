import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import { ShopNotifierService } from './shop-notifier.service';
import { ShopSettingsService } from './shop-settings.service';
import { ConfigService } from '../config/config.service';
import {
  buildCustomerOrderEmailHtml,
  buildCustomerOrderEmailText,
  buildLegalLinks,
  buildOrderDiscordEmbed,
  buildOrderEmailHtml,
  buildOrderEmailText,
  buildRetractationParagraph,
  formatAddress,
  formatEuros,
  getDeliveryDelayText,
  getShopPublicOrigin,
} from './shop-notifier.service';

describe('getDeliveryDelayText', () => {
  const previous = process.env.SHOP_DELIVERY_DELAY_TEXT;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.SHOP_DELIVERY_DELAY_TEXT;
    } else {
      process.env.SHOP_DELIVERY_DELAY_TEXT = previous;
    }
  });

  it('annonce le delai configure quand il existe', () => {
    process.env.SHOP_DELIVERY_DELAY_TEXT = 'sous 10 jours ouvrés';
    expect(getDeliveryDelayText()).toBe('sous 10 jours ouvrés');
  });

  /**
   * Garde-fou contractuel : sans configuration, le mail doit enoncer le delai
   * suppletif legal, jamais une duree plus courte inventee. Un delai annonce
   * engage le vendeur et son depassement ouvre la resolution de la vente.
   */
  it('retombe sur le delai legal de 30 jours plutot que d’inventer une duree', () => {
    delete process.env.SHOP_DELIVERY_DELAY_TEXT;
    const text = getDeliveryDelayText();
    expect(text).toContain('30 jours');
    expect(text).toContain('L216-1');
  });

  it('ignore une valeur vide ou faite d’espaces', () => {
    process.env.SHOP_DELIVERY_DELAY_TEXT = '   ';
    expect(getDeliveryDelayText()).toContain('30 jours');
  });
});

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

const orderSansFlocage = {
  ...(order as object),
  items: [
    {
      productName: 'Maillot',
      size: 'L',
      flockingText: null,
      quantity: 1,
      unitPriceCents: 3990,
      flockingFeeCents: 0,
      lineTotalCents: 3990,
    },
  ],
} as never;

const orderMixte = {
  ...(order as object),
  items: [
    {
      productName: 'Maillot',
      size: 'L',
      flockingText: null,
      quantity: 1,
      unitPriceCents: 3990,
      flockingFeeCents: 0,
      lineTotalCents: 3990,
    },
    {
      productName: 'Maillot floqué',
      size: 'M',
      flockingText: 'Ace',
      quantity: 1,
      unitPriceCents: 4990,
      flockingFeeCents: 500,
      lineTotalCents: 5490,
    },
  ],
} as never;

describe('shop-notifier helpers', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

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
      expect(buildOrderEmailText(orderSansFlocage)).toContain('sans flocage');
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
    it('construit un embed avec le titre, les articles et le total', () => {
      const embed = buildOrderDiscordEmbed(order);
      expect(embed.title).toContain('DVG-2026-0042');
      expect(embed.color).toBe(0x32d299);
      const names = embed.fields.map((f) => f.name);
      expect(names).toEqual(expect.arrayContaining(['Articles', 'Total']));
    });

    it('ne transmet aucune donnée personnelle du client (RGPD)', () => {
      const embed = buildOrderDiscordEmbed(order);
      const serialized = JSON.stringify(embed);
      expect(serialized).not.toContain(order.customerEmail);
      expect(serialized).not.toContain(order.customerName);
      expect(serialized).not.toContain('1 rue du Test');
      expect(embed.fields.map((f) => f.name)).not.toEqual(
        expect.arrayContaining(['Client', 'Adresse de livraison']),
      );
    });

    it('conserve le flocage, nécessaire à la production', () => {
      const embed = buildOrderDiscordEmbed(order);
      const articles = embed.fields.find((f) => f.name === 'Articles');
      expect(articles?.value).toContain('flocage « Snake »');
    });
  });

  describe('getShopPublicOrigin', () => {
    it('utilise SHOP_PUBLIC_URL en priorité, sans slash final', () => {
      process.env.SHOP_PUBLIC_URL = 'https://teamdivergentes.fr/';
      expect(getShopPublicOrigin()).toBe('https://teamdivergentes.fr');
    });

    it('dérive l’origine de SHOP_SUCCESS_URL si SHOP_PUBLIC_URL est absente', () => {
      delete process.env.SHOP_PUBLIC_URL;
      process.env.SHOP_SUCCESS_URL = 'https://teamdivergentes.fr/boutique/merci';
      expect(getShopPublicOrigin()).toBe('https://teamdivergentes.fr');
    });
  });

  describe('buildLegalLinks', () => {
    it('construit les trois liens légaux sur l’origine fournie', () => {
      const links = buildLegalLinks('https://teamdivergentes.fr');
      expect(links.cgv).toBe('https://teamdivergentes.fr/conditions-generales-de-vente');
      expect(links.retractation).toBe('https://teamdivergentes.fr/retractation');
      expect(links.confidentialite).toBe('https://teamdivergentes.fr/politique-de-confidentialite');
    });
  });

  describe('buildRetractationParagraph', () => {
    it('annonce le délai de 14 jours pour une commande sans flocage', () => {
      const text = buildRetractationParagraph(orderSansFlocage);
      expect(text).toContain('14 jours');
      expect(text).toContain('L221-18');
      expect(text).not.toContain('L221-28');
    });

    it('exclut le droit de rétractation pour une commande entièrement floquée', () => {
      const text = buildRetractationParagraph(order);
      expect(text).toContain('L221-28');
      expect(text).toContain('personnalis');
    });

    it('distingue les deux régimes pour une commande mixte', () => {
      const text = buildRetractationParagraph(orderMixte);
      expect(text).toContain('L221-18');
      expect(text).toContain('L221-28');
    });
  });

  describe('buildCustomerOrderEmailText', () => {
    it('contient la référence de commande et le total payé', () => {
      const text = buildCustomerOrderEmailText(order);
      expect(text).toContain('DVG-2026-0042');
      expect(text).toContain('115.70');
    });

    it('reprend le bon texte de rétractation selon la présence de flocage', () => {
      expect(buildCustomerOrderEmailText(order)).toContain('L221-28');
      expect(buildCustomerOrderEmailText(orderSansFlocage)).toContain('14 jours');
    });

    it('ne contient pas de tiret cadratin dans le corps client', () => {
      const text = buildCustomerOrderEmailText(orderSansFlocage);
      expect(text).not.toContain('—');
    });

    it('inclut les liens légaux', () => {
      process.env.SHOP_PUBLIC_URL = 'https://teamdivergentes.fr';
      const text = buildCustomerOrderEmailText(order);
      expect(text).toContain('https://teamdivergentes.fr/conditions-generales-de-vente');
      expect(text).toContain('https://teamdivergentes.fr/retractation');
      expect(text).toContain('https://teamdivergentes.fr/politique-de-confidentialite');
      delete process.env.SHOP_PUBLIC_URL;
    });
  });

  describe('buildCustomerOrderEmailHtml', () => {
    it('échappe le flocage dans le mail client (saisie client)', () => {
      const hostile = {
        ...(order as object),
        items: [
          {
            productName: 'Maillot',
            size: 'M',
            flockingText: '<script>alert(1)</script>',
            quantity: 1,
            unitPriceCents: 4990,
          },
        ],
      } as never;
      const html = buildCustomerOrderEmailHtml(hostile);
      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;');
    });

    it('échappe le nom du client', () => {
      const hostile = { ...(order as object), customerName: '<b>x</b>' } as never;
      expect(buildCustomerOrderEmailHtml(hostile)).toContain('&lt;b&gt;');
    });

    it('contient la référence de commande et le total', () => {
      const html = buildCustomerOrderEmailHtml(order);
      expect(html).toContain('DVG-2026-0042');
      expect(html).toContain('115.70');
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

  it('envoie un mail équipe et un mail client distincts, plus Discord', async () => {
    mockConfigService.getValue.mockImplementation((key: string) =>
      Promise.resolve(smtpConfig[key] ?? null),
    );
    mockSendMail.mockResolvedValue({ messageId: 'ok' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    await service.notifyNewOrder(order);

    expect(mockSendMail).toHaveBeenCalledTimes(2);
    const calls = mockSendMail.mock.calls as unknown as { to: string }[][];
    const recipients = calls.map((call) => call[0].to);
    expect(recipients).toContain('boutique@example.com');
    expect(recipients).toContain(order.customerEmail);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('ne rejette pas si le mail client échoue mais les deux autres canaux réussissent', async () => {
    mockConfigService.getValue.mockImplementation((key: string) =>
      Promise.resolve(smtpConfig[key] ?? null),
    );
    // Le premier envoi (équipe) réussit, le second (client) échoue.
    mockSendMail
      .mockResolvedValueOnce({ messageId: 'ok' })
      .mockRejectedValueOnce(new Error('SMTP down'));
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    await expect(service.notifyNewOrder(order)).resolves.toBeUndefined();
  });

  it('ne rejette pas si Discord échoue mais les deux mails réussissent', async () => {
    mockConfigService.getValue.mockImplementation((key: string) =>
      Promise.resolve(smtpConfig[key] ?? null),
    );
    mockSendMail.mockResolvedValue({ messageId: 'ok' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(service.notifyNewOrder(order)).resolves.toBeUndefined();
  });

  it('ne rejette pas si un seul canal réussit sur les trois', async () => {
    mockConfigService.getValue.mockImplementation((key: string) =>
      Promise.resolve(smtpConfig[key] ?? null),
    );
    // Mail équipe échoue, mail client réussit, Discord échoue.
    mockSendMail
      .mockRejectedValueOnce(new Error('SMTP down'))
      .mockResolvedValueOnce({ messageId: 'ok' });
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(service.notifyNewOrder(order)).resolves.toBeUndefined();
  });

  it('rejette si les trois canaux échouent', async () => {
    mockConfigService.getValue.mockImplementation((key: string) =>
      Promise.resolve(smtpConfig[key] ?? null),
    );
    mockSendMail.mockRejectedValue(new Error('SMTP down'));
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(service.notifyNewOrder(order)).rejects.toThrow(
      `Aucune notification envoyee pour la commande ${order.reference}`,
    );
  });

  it('ne tente pas d’envoyer un mail client sans adresse e-mail', async () => {
    mockConfigService.getValue.mockImplementation((key: string) =>
      Promise.resolve(smtpConfig[key] ?? null),
    );
    mockSendMail.mockResolvedValue({ messageId: 'ok' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const orderSansEmail = { ...(order as object), customerEmail: '' } as never;
    await service.notifyNewOrder(orderSansEmail);

    // Seul le mail équipe part ; le mail client est refusé faute d'adresse.
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const calls = mockSendMail.mock.calls as unknown as { to: string }[][];
    expect(calls[0][0].to).toBe('boutique@example.com');
  });

  describe('notifyStatusChange', () => {
    const at = (status: string, extra: object = {}): never =>
      ({ ...(order as object), status, ...extra }) as never;

    /** Le mail effectivement remis a nodemailer, type plutot que `any`. */
    const firstMail = (): { to: string; subject: string; text: string; html: string } => {
      const calls = mockSendMail.mock.calls as unknown as {
        to: string;
        subject: string;
        text: string;
        html: string;
      }[][];
      return calls[0][0];
    };

    beforeEach(() => {
      mockConfigService.getValue.mockImplementation((key: string) =>
        Promise.resolve(smtpConfig[key] ?? null),
      );
      mockSendMail.mockResolvedValue({ messageId: 'ok' });
    });

    it('prévient le client d’une expédition et lui donne le numéro de suivi', async () => {
      const sent = await service.notifyStatusChange(
        at('SHIPPED', { trackingNumber: 'AB123' }),
        'PAID',
      );

      expect(sent).toBe(true);
      const mail = firstMail();
      expect(mail.to).toBe('client@example.com');
      expect(mail.subject).toContain('expédiée');
      expect(mail.text).toContain('AB123');
    });

    it('n’invente pas de numéro de suivi quand il manque', async () => {
      await service.notifyStatusChange(at('SHIPPED'), 'PAID');

      const mail = firstMail();
      expect(mail.text).not.toContain('Numéro de suivi');
      expect(mail.text).toContain('bien en route');
    });

    it.each([
      ['CANCELLED', 'Annulation'],
      ['REFUNDED', 'Remboursement'],
    ])('prévient le client sur %s', async (status, expected) => {
      const sent = await service.notifyStatusChange(at(status), 'PAID');

      expect(sent).toBe(true);
      expect(firstMail().subject).toContain(expected);
    });

    /**
     * Le declencheur est la transition, pas l'etat d'arrivee : rouvrir une
     * commande deja expediee pour corriger sa note interne est le cas nominal
     * du back-office, et ne doit rien renvoyer.
     */
    it('n’envoie rien quand le statut n’a pas changé', async () => {
      const sent = await service.notifyStatusChange(at('SHIPPED'), 'SHIPPED');

      expect(sent).toBe(false);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it.each(['SENT_TO_MERCHANT', 'IN_PRODUCTION', 'DELIVERED'])(
      'n’envoie rien sur %s',
      async (status) => {
        const sent = await service.notifyStatusChange(at(status), 'PAID');

        expect(sent).toBe(false);
        expect(mockSendMail).not.toHaveBeenCalled();
      },
    );

    it('n’annonce pas une annulation à un panier jamais payé', async () => {
      const sent = await service.notifyStatusChange(at('CANCELLED'), 'PENDING');

      expect(sent).toBe(false);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('n’envoie rien, et ne lève pas, sans adresse client', async () => {
      const sent = await service.notifyStatusChange(at('SHIPPED', { customerEmail: '' }), 'PAID');

      expect(sent).toBe(false);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('propage l’échec SMTP pour que l’appelant le journalise', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP down'));

      await expect(service.notifyStatusChange(at('SHIPPED'), 'PAID')).rejects.toThrow('SMTP down');
    });

    it('échappe le flocage du client dans la version HTML', async () => {
      const hostile = at('SHIPPED', {
        items: [{ ...(order as { items: object[] }).items[0], flockingText: '<script>x</script>' }],
      });

      await service.notifyStatusChange(hostile, 'PAID');

      const mail = firstMail();
      expect(mail.html).not.toContain('<script>');
      expect(mail.html).toContain('&lt;script&gt;');
    });

    /**
     * Le delai de retractation court a compter de la RECEPTION : c'est le mail
     * d'expedition qui arrive au bon moment pour le rappeler.
     */
    it('rappelle le droit de rétractation dans le mail d’expédition', async () => {
      await service.notifyStatusChange(
        { ...(orderSansFlocage as object), status: 'SHIPPED' } as never,
        'PAID',
      );

      const mail = firstMail();
      expect(mail.text).toContain('14 jours');
      expect(mail.text).toContain('conditions-generales-de-vente');
    });

    /**
     * Le delai de remboursement depend de la banque du porteur : l'annoncer
     * engagerait l'association sur un tiers.
     */
    it('ne promet aucun délai de remboursement', async () => {
      await service.notifyStatusChange(at('REFUNDED'), 'CANCELLED');

      const mail = firstMail();
      expect(mail.text).toContain('établissement bancaire');
      expect(mail.text).toMatch(/115\.70 €/);
    });
  });

  describe('notifyStockShortfall', () => {
    const shortfalls = [
      { productId: 1, productName: 'Maillot', size: 'M', sizeId: 10, requested: 3, available: 1 },
    ];

    beforeEach(() => {
      mockConfigService.getValue.mockImplementation((key: string) =>
        Promise.resolve(smtpConfig[key] ?? null),
      );
    });

    it('envoie une alerte équipe par mail et Discord', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'ok' });
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      await service.notifyStockShortfall(order, shortfalls);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const calls = mockSendMail.mock.calls as unknown as { to: string; subject: string }[][];
      expect(calls[0][0].to).toBe('boutique@example.com');
      expect(calls[0][0].subject).toContain('Survente');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('ne prévient jamais le client : aucun mail hors des deux canaux internes', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'ok' });
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      await service.notifyStockShortfall(order, shortfalls);

      const calls = mockSendMail.mock.calls as unknown as { to: string }[][];
      const recipients = calls.map((call) => call[0].to);
      expect(recipients).not.toContain(order.customerEmail);
    });

    it('ne rejette pas si un seul canal réussit', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'ok' });
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.notifyStockShortfall(order, shortfalls)).resolves.toBeUndefined();
    });

    it('rejette si les deux canaux échouent', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP down'));
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.notifyStockShortfall(order, shortfalls)).rejects.toThrow(
        `Aucune alerte de rupture de stock envoyée pour la commande ${order.reference}`,
      );
    });

    it('détaille les lignes en dépassement dans le mail équipe', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'ok' });
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      await service.notifyStockShortfall(order, shortfalls);

      const calls = mockSendMail.mock.calls as unknown as { text: string }[][];
      expect(calls[0][0].text).toContain('Maillot');
      expect(calls[0][0].text).toContain('taille M');
      expect(calls[0][0].text).toContain('3');
      expect(calls[0][0].text).toContain('1');
    });
  });
});
