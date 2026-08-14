import { randomInt } from 'node:crypto';
import { DiscountType } from '../../generated/prisma';

/**
 * Ce qu'un bon de reduction retire d'un panier, et ce qui autorise a s'en
 * servir.
 *
 * Tout ce qui est calculable sans la base vit ici : le montant deduit, la
 * fenetre de validite, la forme d'un code. Le service garde ce qui demande de
 * lire ou d'ecrire — resolution, comptage des utilisations, consommation.
 */

/** Longueur d'un code produit par le generateur. */
export const GENERATED_CODE_LENGTH = 8;

/**
 * Alphabet du generateur : majuscules et chiffres, prives des caracteres qui
 * se confondent a l'oral ou a la lecture.
 *
 * `O`/`0`, `I`/`1`/`L` sont retires parce qu'un code se dicte et se recopie
 * depuis une capture d'ecran. Un `0` lu « O » produit un refus que le client
 * ne comprend pas, et un message a traiter pour l'association.
 */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Ce qu'un code saisi a la main a le droit de contenir. */
export const CODE_PATTERN = /^[A-Z0-9-]{3,32}$/;

/**
 * Met un code sous sa forme canonique.
 *
 * Les codes sont stockes en majuscules : Postgres compare les chaines avec la
 * casse, et normaliser a l'ecriture est ce qui rend l'unicite et la recherche
 * reellement insensibles a la casse, sans index fonctionnel. Les espaces de
 * bord sautent parce qu'un code colle depuis un message en traine presque
 * toujours.
 */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Vrai quand le code a une forme acceptable pour etre enregistre. */
export function isValidCodeShape(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/**
 * Produit un code aleatoire lisible.
 *
 * `randomInt` et non `Math.random` : un code devinable sur un geste
 * commercial n'a plus grand interet, et le cout d'un generateur sur est nul
 * ici.
 */
export function generateCode(length: number = GENERATED_CODE_LENGTH): string {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/** Les seuls champs d'un code dont depend le calcul du montant deduit. */
export interface DiscountRule {
  type: DiscountType;
  /** Centimes pour `FIXED`, points de pourcentage pour `PERCENTAGE`. */
  value: number;
}

/**
 * Ce que le code retire du sous-total articles.
 *
 * Deux bornes, et elles sont la pour de bonnes raisons :
 *
 * - **jamais plus que le panier.** Un code de 20 EUR sur un panier de 15 EUR
 *   deduit 15 EUR, pas 20. Sans ce plafond le total passe sous zero, et un
 *   total negatif transmis a Stripe est une erreur d'integration, pas un
 *   remboursement ;
 * - **jamais moins que zero.** Une valeur negative en base — saisie fautive,
 *   migration bancale — ne doit pas se transformer en majoration silencieuse.
 *
 * L'arrondi du pourcentage se fait vers le bas : entre deux centimes, celui
 * qui va au client est celui qui ne cree pas d'ecart avec le montant annonce.
 */
export function discountAmount(rule: DiscountRule, subtotalCents: number): number {
  const raw =
    rule.type === 'PERCENTAGE' ? Math.floor((subtotalCents * rule.value) / 100) : rule.value;

  return Math.min(Math.max(raw, 0), Math.max(subtotalCents, 0));
}

/** Vrai quand `now` tombe dans la fenetre. Une borne nulle est ouverte. */
export function isWithinWindow(
  window: { startsAt: Date | null; endsAt: Date | null },
  now: Date,
): boolean {
  if (window.startsAt && now < window.startsAt) {
    return false;
  }
  return !(window.endsAt && now > window.endsAt);
}

/**
 * Prix public applicable a un produit a l'instant `now`.
 *
 * Le prix promotionnel s'applique sans que le client ait rien a saisir, et
 * uniquement dans sa fenetre. Hors fenetre, le prix catalogue reprend seul :
 * c'est ce qui evite qu'une operation oubliee continue a se facturer.
 *
 * Le garde-fou sur un prix promotionnel superieur au catalogue n'est pas
 * defensif pour rien : une promotion qui augmente le prix serait un defaut
 * invisible en base et bien visible en caisse.
 */
export function applicableUnitPrice(
  product: {
    priceCents: number;
    promoPriceCents?: number | null;
    promoStartsAt?: Date | null;
    promoEndsAt?: Date | null;
  },
  now: Date,
): number {
  const { promoPriceCents } = product;
  // `== null` couvre `null` et `undefined` : le premier vient de la base, le
  // second d'un objet construit sans ces champs. Les distinguer ferait
  // retourner `undefined` comme prix, et un NaN se propagerait jusqu'au total.
  if (promoPriceCents == null || promoPriceCents >= product.priceCents) {
    return product.priceCents;
  }
  const window = {
    startsAt: product.promoStartsAt ?? null,
    endsAt: product.promoEndsAt ?? null,
  };
  return isWithinWindow(window, now) ? promoPriceCents : product.priceCents;
}
