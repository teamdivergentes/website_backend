import { buildArticleWhere } from './article-where.util';

describe('buildArticleWhere', () => {
  it('retourne un objet vide pour une query sans filtres', () => {
    expect(buildArticleWhere({})).toEqual({});
  });

  it('applique le filtre published = true', () => {
    const where = buildArticleWhere({ published: true });
    expect(where.published).toBe(true);
  });

  it('applique le filtre published = false', () => {
    const where = buildArticleWhere({ published: false });
    expect(where.published).toBe(false);
  });

  it('applique le filtre featured', () => {
    const where = buildArticleWhere({ featured: true });
    expect(where.featured).toBe(true);
  });

  it('applique le filtre typeId', () => {
    const where = buildArticleWhere({ typeId: 3 });
    expect(where.typeId).toBe(3);
  });

  it('applique la recherche plein texte sur title et excerpt', () => {
    const where = buildArticleWhere({ search: 'valorant' });
    expect(where.OR).toHaveLength(2);
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    expect(where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: expect.objectContaining({ contains: 'valorant' }) }),
        expect.objectContaining({ excerpt: expect.objectContaining({ contains: 'valorant' }) }),
      ]),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });

  it('utilise le mode insensible à la casse pour la recherche', () => {
    const where = buildArticleWhere({ search: 'TEST' });
    const orClause = where.OR as { title?: { mode: string } }[];
    expect(orClause[0].title?.mode).toBe('insensitive');
  });

  it('combine plusieurs filtres simultanément', () => {
    const where = buildArticleWhere({ published: true, featured: false, typeId: 2 });
    expect(where.published).toBe(true);
    expect(where.featured).toBe(false);
    expect(where.typeId).toBe(2);
    expect(where.OR).toBeUndefined();
  });

  it("n'applique pas typeId si undefined", () => {
    const where = buildArticleWhere({ typeId: undefined });
    expect(where.typeId).toBeUndefined();
  });

  it("n'applique pas la recherche si search est une chaîne vide", () => {
    const where = buildArticleWhere({ search: '' });
    expect(where.OR).toBeUndefined();
  });

  it('ignore page et limit (non présents dans le where)', () => {
    const where = buildArticleWhere({ page: 2, limit: 10 });
    expect(Object.keys(where)).toHaveLength(0);
  });
});
