/**
 * Retire les occurrences d'un caractere en tete et en fin de chaine.
 *
 * Ecrit a la main plutot qu'avec une expression comme `/^-+|-+$/g` : ancree
 * en fin de chaine, une repetition gourmande fait repartir le moteur a chaque
 * position sur une entree composee uniquement de ce caractere, soit un cout
 * quadratique (`typescript:S8786`). Le parcours par index est lineaire, et se
 * lit au moins aussi bien.
 *
 * Le caractere est compare tel quel, sans echappement : la fonction ne prend
 * pas de motif, seulement un caractere.
 */
export function trimChar(value: string, char: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && value[start] === char) {
    start += 1;
  }
  while (end > start && value[end - 1] === char) {
    end -= 1;
  }

  return value.slice(start, end);
}

/**
 * Meme chose, en fin de chaine seulement.
 *
 * Distincte de `trimChar` a dessein : rogner aussi le debut changerait le sens
 * d'une URL protocol-relative (`//exemple.fr` deviendrait `exemple.fr`). La
 * fonction sert a normaliser une origine publique qui part dans les courriels
 * clients, ou une difference de ce genre se voit.
 */
export function trimTrailingChar(value: string, char: string): string {
  let end = value.length;

  while (end > 0 && value[end - 1] === char) {
    end -= 1;
  }

  return value.slice(0, end);
}
