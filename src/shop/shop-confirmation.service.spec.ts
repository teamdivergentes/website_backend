import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { ShopConfirmationService, firstNameOf, maskEmail } from './shop-confirmation.service';

describe('ShopConfirmationService', () => {
  let service: ShopConfirmationService;

  const mockPrisma = { order: { findUnique: jest.fn() } };

  const paidOrder = {
    reference: 'DVG-2026-0042',
    customerName: 'Maxime Bellet',
    customerFirstName: 'Maxime',
    customerLastName: 'Bellet',
    customerEmail: 'maxime.bellet@example.com',
    status: 'PAID',
    totalCents: 8500,
    currency: 'eur',
    items: [
      {
        productName: 'Maillot 2026 Joker',
        size: 'L',
        flockingText: 'MAX',
        quantity: 1,
      },
    ],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShopConfirmationService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(ShopConfirmationService);
  });

  it('resume la commande rattachee a la session', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(paidOrder);

    const result = await service.findBySessionId('cs_test_a1b2c3d4e5f6');

    expect(result).toEqual({
      reference: 'DVG-2026-0042',
      firstName: 'Maxime',
      paid: true,
      maskedEmail: 'm•••••••••••t@example.com',
      items: [{ productName: 'Maillot 2026 Joker', size: 'L', flockingText: 'MAX', quantity: 1 }],
      totalCents: 8500,
      currency: 'eur',
    });
  });

  it("n'expose ni le nom complet ni l'adresse de livraison", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      ...paidOrder,
      shippingAddress: { line1: '12 rue des Lilas', city: 'Nantes' },
    });

    const result = await service.findBySessionId('cs_test_a1b2c3d4e5f6');

    // L'identifiant de session voyage dans une URL : la reponse ne doit rien
    // porter qui identifie ou localise l'acheteur.
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('Bellet');
    expect(serialized).not.toContain('rue des Lilas');
    expect(serialized).not.toContain('maxime.bellet@example.com');
  });

  it("signale une commande dont le paiement n'est pas encore confirme", async () => {
    // Le client arrive presque toujours avant le webhook Stripe.
    mockPrisma.order.findUnique.mockResolvedValue({
      ...paidOrder,
      status: 'PENDING',
      // Une commande PENDING n'est jamais passee par le webhook : aucun champ
      // d'identite n'est renseigne, pas seulement le nom complet.
      customerName: '',
      customerFirstName: '',
      customerLastName: '',
      customerEmail: '',
    });

    const result = await service.findBySessionId('cs_test_a1b2c3d4e5f6');

    expect(result.paid).toBe(false);
    expect(result.firstName).toBeNull();
    expect(result.maskedEmail).toBeNull();
  });

  it('refuse un identifiant de session mal forme sans interroger la base', async () => {
    await expect(service.findBySessionId('../../etc/passwd')).rejects.toThrow(NotFoundException);
    expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
  });

  it('repond 404 sur une session inconnue', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);

    await expect(service.findBySessionId('cs_test_inconnue0000')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('firstNameOf', () => {
  it('prefere le champ prenom au decoupage du nom complet', () => {
    expect(firstNameOf('Jean', 'Dupont Jean')).toBe('Jean');
    expect(firstNameOf('  Marie-Claire  ', 'Durand Marie-Claire')).toBe('Marie-Claire');
  });

  /**
   * Le repli est la raison d'etre des deux champs separes : sans eux, une
   * identite saisie « nom prenom » donnait un « Bonjour Dupont ». Le test fige
   * ce comportement comme un pis-aller, pas comme une intention.
   */
  it('retombe sur le premier mot du nom complet quand le prenom manque', () => {
    expect(firstNameOf('', 'Maxime Bellet')).toBe('Maxime');
    expect(firstNameOf('   ', '  Jean-Pierre  Martin ')).toBe('Jean-Pierre');
    expect(firstNameOf('', 'Dupont Jean')).toBe('Dupont');
  });

  /**
   * La page de remerciement s'affiche apres encaissement : une donnee absente
   * doit y couter le prenom, jamais un ecran d'erreur.
   */
  it('tolere une identite absente sans lever', () => {
    expect(firstNameOf(undefined, undefined)).toBeNull();
    expect(firstNameOf(null, 'Maxime Bellet')).toBe('Maxime');
  });

  it('rend null sur un nom absent ou aberrant', () => {
    expect(firstNameOf('', '')).toBeNull();
    expect(firstNameOf('   ', '   ')).toBeNull();
    // Champ libre cote Stripe : une chaine de 200 caracteres n'est pas un
    // prenom et n'a rien a faire dans un titre de page.
    expect(firstNameOf('', 'a'.repeat(60))).toBeNull();
    expect(firstNameOf('a'.repeat(60), 'Maxime Bellet')).toBeNull();
  });
});

describe('maskEmail', () => {
  it('conserve la premiere et la derniere lettre, ainsi que le domaine', () => {
    expect(maskEmail('maxime@gmail.com')).toBe('m••••e@gmail.com');
  });

  it('masque entierement une partie locale tres courte', () => {
    expect(maskEmail('ab@gmail.com')).toBe('••@gmail.com');
  });

  it('rend null sur une adresse absente ou invalide', () => {
    expect(maskEmail('')).toBeNull();
    expect(maskEmail('pas-une-adresse')).toBeNull();
    expect(maskEmail('@gmail.com')).toBeNull();
    expect(maskEmail('maxime@')).toBeNull();
  });
});
