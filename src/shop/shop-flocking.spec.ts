import { BadRequestException } from '@nestjs/common';
import { assertFlockingAllowed, normalizeFlocking, FLOCKING_MAX_LENGTH } from './shop-flocking';

const product = { name: 'Maillot 2026', allowFlocking: true };

describe('normalizeFlocking', () => {
  it('retourne null pour une saisie absente', () => {
    expect(normalizeFlocking(undefined)).toBeNull();
    expect(normalizeFlocking(null)).toBeNull();
  });

  it('retourne null pour une chaine vide ou uniquement des espaces', () => {
    expect(normalizeFlocking('   ')).toBeNull();
    expect(normalizeFlocking('')).toBeNull();
  });

  it('trim et reduit les espaces internes multiples', () => {
    expect(normalizeFlocking('  Sn1per   Elite  ')).toBe('Sn1per Elite');
  });
});

describe('assertFlockingAllowed', () => {
  it('ne fait rien si le flocage est null', () => {
    expect(() => assertFlockingAllowed(null, { name: 'X', allowFlocking: false })).not.toThrow();
  });

  it("refuse le flocage si le produit ne l'autorise pas", () => {
    expect(() => assertFlockingAllowed('Snake', { name: 'X', allowFlocking: false })).toThrow(
      BadRequestException,
    );
  });

  it('refuse un flocage trop long', () => {
    const tooLong = 'A'.repeat(FLOCKING_MAX_LENGTH + 1);
    expect(() => assertFlockingAllowed(tooLong, product)).toThrow(BadRequestException);
  });

  it('refuse un caractere hors charte (injection HTML/CSV)', () => {
    expect(() => assertFlockingAllowed('<script>', product)).toThrow(BadRequestException);
    expect(() => assertFlockingAllowed('=1+1', product)).toThrow(BadRequestException);
  });

  describe('pseudos gaming legitimes (cas passants)', () => {
    const legitimatePseudos = [
      'xXSlayerXx',
      'N1nja',
      'DarkKnight',
      'Ph3nix',
      'TryHard',
      'Assassin',
      'Speeder',
      'TopDawg',
      'Trigger',
      'Kill3r',
      'GG-Ez',
      'Bo55man',
      'Snake',
      'Legende',
    ];

    it.each(legitimatePseudos)('accepte "%s"', (pseudo) => {
      expect(() => assertFlockingAllowed(pseudo, product)).not.toThrow();
    });
  });

  describe('contournements bloques (cas bloquants)', () => {
    const forbiddenAttempts = [
      'fuck',
      'FUCK',
      'F.U.C.K',
      'FUUUCK',
      'N4z1',
      'put4in',
      'sa.lo.pe',
      'bit-ch',
      'connard',
      'nigger',
      'nigg3r',
      'hitler',
    ];

    it.each(forbiddenAttempts)('refuse "%s"', (attempt) => {
      expect(() => assertFlockingAllowed(attempt, product)).toThrow(BadRequestException);
    });

    it('renvoie un message francais non insultant', () => {
      try {
        assertFlockingAllowed('fuck', product);
        fail('devait lever une BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse();
        const message =
          typeof response === 'string' ? response : (response as { message: string }).message;
        expect(message).toContain('flocage');
        expect(message.toLowerCase()).not.toMatch(/fuck|connard|nazi/);
      }
    });
  });
});
