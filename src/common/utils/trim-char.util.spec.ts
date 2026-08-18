import { trimChar } from './trim-char.util';

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
