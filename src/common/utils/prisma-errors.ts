const PRISMA_NOT_FOUND_CODE = 'P2025';
const PRISMA_FOREIGN_KEY_CODE = 'P2003';

function hasCodeProperty(error: unknown): error is { code: unknown } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return hasCodeProperty(error) && error.code === code;
}

export function isPrismaNotFoundError(error: unknown): boolean {
  return hasPrismaCode(error, PRISMA_NOT_FOUND_CODE);
}

export function isPrismaForeignKeyError(error: unknown): boolean {
  return hasPrismaCode(error, PRISMA_FOREIGN_KEY_CODE);
}
