import { trimChar, trimTrailingChar } from './trim-char.util';

describe('trimChar', () => {
  it('retire le caractere en tete et en fin', () => {
    expect(trimChar('---slug---', '-')).toBe('slug');
    expect(trimChar('https://exemple.fr///', '/')).toBe('https://exemple.fr');
  });

  it('laisse intactes les occurrences internes', () => {
    expect(trimChar('-mon-slug-compose-', '-')).toBe('mon-slug-compose');
  });

  it('rend une chaine vide quand tout est a retirer', () => {
    expect(trimChar('-----', '-')).toBe('');
    expect(trimChar('', '-')).toBe('');
  });

  it('laisse intacte une chaine sans le caractere', () => {
    expect(trimChar('slug', '-')).toBe('slug');
  });
});

describe('trimTrailingChar', () => {
  it('ne rogne que la fin', () => {
    expect(trimTrailingChar('https://exemple.fr///', '/')).toBe('https://exemple.fr');
  });

  /**
   * C'est la raison d'etre de cette seconde fonction : une URL
   * protocol-relative perd son sens si on lui retire ses barres de tete.
   */
  it('preserve une URL protocol-relative', () => {
    expect(trimTrailingChar('//exemple.fr/', '/')).toBe('//exemple.fr');
    expect(trimChar('//exemple.fr/', '/')).toBe('exemple.fr');
  });

  it('rend une chaine vide quand tout est a retirer', () => {
    expect(trimTrailingChar('///', '/')).toBe('');
  });
});
