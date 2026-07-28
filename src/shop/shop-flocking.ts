import { BadRequestException } from '@nestjs/common';

export const FLOCKING_MAX_LENGTH = 12;

/**
 * Charset volontairement restrictif. Ce texte est saisi par un inconnu puis
 * reinjecte dans un mail HTML et dans un export CSV : `<` et `>` ouvrent sur de
 * l'injection HTML, et `=`, `+`, `@`, `-` en tete de cellule sur de l'injection
 * de formule CSV. Il finit par ailleurs imprime sur un vetement, ou l'unicode
 * exotique n'a pas sa place.
 */
const ALLOWED_CHARS = /^[A-Za-z0-9 .\-_]+$/;

/**
 * Normalise un flocage : trim, espaces internes reduits a un seul.
 * Retourne `null` pour une saisie absente ou vide — « ne rien mettre » est un
 * choix valide, et ne doit pas facturer le surcout.
 */
export function normalizeFlocking(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const normalized = raw.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
}

/**
 * Valide un flocage deja normalise, dans le contexte d'un produit donne.
 * Leve une `BadRequestException` plutot que de retourner un booleen : l'appelant
 * est toujours un chemin de requete, et le message doit remonter au client.
 */
export function assertFlockingAllowed(
  flocking: string | null,
  product: { name: string; allowFlocking: boolean },
): void {
  if (flocking === null) {
    return;
  }

  if (!product.allowFlocking) {
    throw new BadRequestException(`Le flocage n'est pas disponible pour « ${product.name} »`);
  }

  if (flocking.length > FLOCKING_MAX_LENGTH) {
    throw new BadRequestException(
      `Le flocage ne peut pas dépasser ${FLOCKING_MAX_LENGTH} caractères`,
    );
  }

  if (!ALLOWED_CHARS.test(flocking)) {
    throw new BadRequestException(
      'Le flocage ne peut contenir que des lettres, chiffres, espaces, points, tirets et underscores',
    );
  }
}
