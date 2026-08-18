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
