import { BadRequestException } from '@nestjs/common';
import { parseOptionalIntegerQueryParam } from './query-params';

describe('query-params utils', () => {
  it('retourne undefined quand le paramètre est absent', () => {
    expect(parseOptionalIntegerQueryParam(undefined, 'message')).toBeUndefined();
  });

  it('parse un entier optionnel valide', () => {
    expect(parseOptionalIntegerQueryParam('42', 'message')).toBe(42);
  });

  it('rejette une valeur non numérique', () => {
    expect(() => parseOptionalIntegerQueryParam('abc', 'message')).toThrow(BadRequestException);
  });

  it('rejette une valeur inférieure au minimum demandé', () => {
    expect(() => parseOptionalIntegerQueryParam('0', 'message', { min: 1 })).toThrow(
      BadRequestException,
    );
  });
});
