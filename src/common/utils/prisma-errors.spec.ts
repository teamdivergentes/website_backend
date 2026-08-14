import { isPrismaForeignKeyError, isPrismaNotFoundError } from './prisma-errors';

describe('prisma-errors utils', () => {
  it('identifie les erreurs Prisma connues par code', () => {
    expect(isPrismaNotFoundError({ code: 'P2025' })).toBe(true);
    expect(isPrismaForeignKeyError({ code: 'P2003' })).toBe(true);
  });

  it('rejette les erreurs sans le code attendu', () => {
    expect(isPrismaNotFoundError({ code: 'P2003' })).toBe(false);
    expect(isPrismaForeignKeyError({ code: 'P2025' })).toBe(false);
    expect(isPrismaNotFoundError(new Error('boom'))).toBe(false);
    expect(isPrismaForeignKeyError(null)).toBe(false);
  });
});
