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
 * Liste d'expressions interdites au flocage : insultes et termes haineux,
 * francais et anglais. Volontairement externalisee dans une constante pour
 * rester facile a completer sans toucher a la logique de validation.
 *
 * Chaque entree est deja "normalisable" : elle est comparee apres le meme
 * nettoyage que la saisie utilisateur (cf. `normalizeForModeration`), donc
 * pas besoin de lister les variantes accentuees, majuscules ou leetspeak.
 *
 * Volontairement restreinte a des mots entiers et non ambigus : un mot trop
 * court (« con », « ass »...) genererait des faux positifs sur des pseudos
 * gaming legitimes (« Conquest », « Assassin »...). Cette liste n'est qu'une
 * premiere barriere, pas une garantie d'exhaustivite — cf. avertissement sur
 * `assertFlockingAllowed`.
 */
const FORBIDDEN_EXPRESSIONS: readonly string[] = [
  // Insultes courantes (FR)
  'connard',
  'connasse',
  'encule',
  'salope',
  'batard',
  'pute',
  'putain',
  'fdp',
  'ntm',
  // Haine / discrimination (FR)
  'nazi',
  'hitler',
  'negro',
  'bougnoule',
  'youpin',
  'bicot',
  // Insultes courantes (EN)
  'bitch',
  'whore',
  'slut',
  'cunt',
  'asshole',
  'fuck',
  // Haine / discrimination (EN)
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'chink',
  'kike',
];

/**
 * Table de substitution leetspeak -> lettre d'origine, limitee aux
 * correspondances usuelles demandees : 0/1/3/4/5/7. Les autres chiffres
 * (2, 6, 8, 9) ne remplacent aucune lettre standard et sont simplement
 * retires par le nettoyage final.
 */
const LEETSPEAK_SUBSTITUTIONS: ReadonlyArray<[RegExp, string]> = [
  [/0/g, 'o'],
  [/1/g, 'i'],
  [/3/g, 'e'],
  [/4/g, 'a'],
  [/5/g, 's'],
  [/7/g, 't'],
];

/**
 * Reduit toute suite de 2+ caracteres identiques a un seul. Neutralise le
 * contournement par repetition (« fuuuuuck », « n.a.z.i » une fois les
 * separateurs deja retires ne devient pas un probleme, mais « ffuuuuck » si).
 * Applique symetriquement a la saisie et a la liste interdite au moment de la
 * comparaison, donc sans risque d'incoherence entre les deux cotes.
 */
function collapseRepeatedChars(value: string): string {
  return value.replace(/(.)\1+/g, '$1');
}

/**
 * Normalise une chaine pour la comparaison anti-contournement : minuscules,
 * suppression des accents, substitution leetspeak, suppression de tout ce qui
 * n'est pas une lettre (espaces, ponctuation, separateurs...), puis reduction
 * des repetitions. Le resultat n'est *pas* le flocage final envoye a
 * l'atelier — juste une forme de comparaison interne a la moderation.
 */
function normalizeForModeration(value: string): string {
  let normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // retire les diacritiques (é -> e, etc.)

  for (const [pattern, replacement] of LEETSPEAK_SUBSTITUTIONS) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized.replace(/[^a-z]/g, '');

  return collapseRepeatedChars(normalized);
}

/**
 * Verifie si un flocage (deja normalise pour l'affichage) contient une
 * expression interdite, y compris apres tentative de contournement par
 * separateurs, repetition ou leetspeak.
 */
function containsForbiddenExpression(flocking: string): boolean {
  const normalizedInput = normalizeForModeration(flocking);
  if (normalizedInput.length === 0) {
    return false;
  }
  return FORBIDDEN_EXPRESSIONS.some((expression) => {
    const normalizedExpression = collapseRepeatedChars(expression);
    return normalizedInput.includes(normalizedExpression);
  });
}

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
 *
 * IMPORTANT : le filtre de moderation ci-dessous est une premiere barriere
 * automatique, pas une garantie. Il attrape les insultes et contournements
 * evidents, mais ne sait pas reconnaitre le nom d'une personne reelle ou une
 * marque deposee. Un controle humain avant envoi a l'atelier reste
 * necessaire, et les CGV reservent au vendeur le droit de refuser un
 * flocage meme s'il a passe cette validation automatique.
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

  if (containsForbiddenExpression(flocking)) {
    throw new BadRequestException(
      "Ce texte n'est pas autorisé pour le flocage. Merci d'en choisir un autre.",
    );
  }
}
