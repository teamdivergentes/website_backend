import {
  buildOrderDiscordEmbed,
  buildOrderEmailHtml,
  buildOrderEmailText,
  formatAddress,
  formatEuros,
} from './shop-notifier.service';

const order = {
  id: 1,
  reference: 'DVG-2026-0042',
  productName: 'MAILLOT 2023',
  size: 'M',
  quantity: 2,
  unitPriceCents: 3990,
  shippingCents: 400,
  totalCents: 8380,
  customerEmail: 'client@example.com',
  customerName: 'Jean Dupont',
  shippingAddress: {
    name: 'Jean Dupont',
    address: { line1: '1 rue du Test', postal_code: '75001', city: 'Paris', country: 'FR' },
  },
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
    it('contient la référence, le produit, la taille et le total', () => {
      const text = buildOrderEmailText(order);
      expect(text).toContain('DVG-2026-0042');
      expect(text).toContain('MAILLOT 2023');
      expect(text).toContain('M');
      expect(text).toContain('83.80');
    });
  });

  describe('buildOrderEmailHtml', () => {
    it('échappe le HTML présent dans les données client', () => {
      const hostile = { ...order, customerName: '<script>alert(1)</script>' } as never;
      const html = buildOrderEmailHtml(hostile);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('buildOrderDiscordEmbed', () => {
    it('construit un embed avec le titre et les champs attendus', () => {
      const embed = buildOrderDiscordEmbed(order);
      expect(embed.title).toContain('DVG-2026-0042');
      expect(embed.color).toBe(0x32d299);
      const names = embed.fields.map((f) => f.name);
      expect(names).toEqual(
        expect.arrayContaining(['Produit', 'Client', 'Total', 'Adresse de livraison']),
      );
    });
  });
});
