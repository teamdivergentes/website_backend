import { BadGatewayException } from '@nestjs/common';
import {
  gaParseFloat,
  gaParseInt,
  calcChangePercent,
  buildComparison,
  computePreviousPeriod,
  GA_API_TIMEOUT_MS,
} from './analytics.helpers';

describe('analytics.helpers', () => {
  // -------------------------------------------------------------------------
  // Constantes
  // -------------------------------------------------------------------------
  describe('GA_API_TIMEOUT_MS', () => {
    it('devrait valoir 10000 ms', () => {
      expect(GA_API_TIMEOUT_MS).toBe(10000);
    });
  });

  // -------------------------------------------------------------------------
  // gaParseFloat
  // -------------------------------------------------------------------------
  describe('gaParseFloat', () => {
    it('devrait parser une chaîne en nombre flottant', () => {
      expect(gaParseFloat('3.14')).toBe(3.14);
    });

    it('devrait retourner 0 pour undefined', () => {
      expect(gaParseFloat(undefined)).toBe(0);
    });

    it('devrait retourner 0 pour une chaîne vide', () => {
      expect(gaParseFloat('')).toBe(0);
    });

    it('devrait retourner 0 pour une chaîne non numérique', () => {
      expect(gaParseFloat('abc')).toBe(0);
    });

    it('devrait parser un entier sous forme de float', () => {
      expect(gaParseFloat('42')).toBe(42);
    });

    it('devrait retourner 0 pour "0"', () => {
      expect(gaParseFloat('0')).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // gaParseInt
  // -------------------------------------------------------------------------
  describe('gaParseInt', () => {
    it('devrait parser une chaîne en entier', () => {
      expect(gaParseInt('42')).toBe(42);
    });

    it('devrait retourner 0 pour undefined', () => {
      expect(gaParseInt(undefined)).toBe(0);
    });

    it('devrait retourner 0 pour une chaîne vide', () => {
      expect(gaParseInt('')).toBe(0);
    });

    it('devrait retourner 0 pour une chaîne non numérique', () => {
      expect(gaParseInt('abc')).toBe(0);
    });

    it('devrait tronquer la partie décimale', () => {
      expect(gaParseInt('9.9')).toBe(9);
    });

    it('devrait retourner 0 pour "0"', () => {
      expect(gaParseInt('0')).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // calcChangePercent
  // -------------------------------------------------------------------------
  describe('calcChangePercent', () => {
    it('devrait calculer un pourcentage de variation positif', () => {
      expect(calcChangePercent(150, 100)).toBe(50);
    });

    it('devrait calculer un pourcentage de variation négatif', () => {
      expect(calcChangePercent(50, 100)).toBe(-50);
    });

    it('devrait retourner 100 si précédent vaut 0 et courant > 0', () => {
      expect(calcChangePercent(10, 0)).toBe(100);
    });

    it('devrait retourner 0 si précédent et courant valent 0', () => {
      expect(calcChangePercent(0, 0)).toBe(0);
    });

    it('devrait arrondir à 2 décimales', () => {
      expect(calcChangePercent(1, 3)).toBe(-66.67);
    });

    it('devrait retourner 0 si les valeurs sont identiques', () => {
      expect(calcChangePercent(100, 100)).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // buildComparison
  // -------------------------------------------------------------------------
  describe('buildComparison', () => {
    it('devrait construire un objet MetricWithComparison correct', () => {
      const result = buildComparison(200, 100);
      expect(result.value).toBe(200);
      expect(result.previous).toBe(100);
      expect(result.changePercent).toBe(100);
    });

    it('devrait inclure un changePercent négatif si la valeur a baissé', () => {
      const result = buildComparison(50, 200);
      expect(result.changePercent).toBe(-75);
    });

    it('devrait gérer previous = 0 sans division par zéro', () => {
      const result = buildComparison(5, 0);
      expect(result.changePercent).toBe(100);
    });

    it('devrait retourner changePercent = 0 si les deux valeurs sont 0', () => {
      const result = buildComparison(0, 0);
      expect(result.changePercent).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // computePreviousPeriod
  // -------------------------------------------------------------------------
  describe('computePreviousPeriod', () => {
    it("devrait calculer la période précédente pour une durée d'un mois", () => {
      // 2024-02-01 -> 2024-02-29 (29 jours)
      const result = computePreviousPeriod('2024-02-01', '2024-02-29');
      expect(result.prevEnd).toBe('2024-01-31');
      expect(result.prevStart).toBe('2024-01-03');
    });

    it('devrait calculer la période précédente pour une semaine', () => {
      // 2024-01-08 -> 2024-01-14 (6 jours de durée)
      const result = computePreviousPeriod('2024-01-08', '2024-01-14');
      // prevEnd = 2024-01-07 (veille du start)
      // durationMs = 6j
      // prevStart = 2024-01-07 - 6j = 2024-01-01
      expect(result.prevEnd).toBe('2024-01-07');
      expect(result.prevStart).toBe('2024-01-01');
    });

    it('devrait calculer la période précédente pour un seul jour', () => {
      const result = computePreviousPeriod('2024-03-15', '2024-03-15');
      // durationMs = 0
      // prevEnd = 2024-03-14
      // prevStart = 2024-03-14
      expect(result.prevEnd).toBe('2024-03-14');
      expect(result.prevStart).toBe('2024-03-14');
    });

    it('devrait lancer BadGatewayException si startDate est invalide', () => {
      expect(() => computePreviousPeriod('invalid-date', '2024-01-31')).toThrow(
        BadGatewayException,
      );
    });

    it('devrait lancer BadGatewayException si endDate est invalide', () => {
      expect(() => computePreviousPeriod('2024-01-01', 'not-a-date')).toThrow(BadGatewayException);
    });

    it('devrait lancer BadGatewayException si les deux dates sont invalides', () => {
      expect(() => computePreviousPeriod('bad', 'dates')).toThrow(BadGatewayException);
    });

    it('devrait retourner des dates au format YYYY-MM-DD', () => {
      const result = computePreviousPeriod('2024-06-01', '2024-06-30');
      expect(result.prevStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.prevEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
