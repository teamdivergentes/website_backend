import { SHOP_CATALOG, findActiveProduct, getActiveProducts } from './shop-catalog';

describe('shop-catalog', () => {
  it('contient les 11 produits du catalogue', () => {
    expect(SHOP_CATALOG).toHaveLength(11);
  });

  it('exprime tous les prix en centimes entiers', () => {
    for (const product of SHOP_CATALOG) {
      expect(Number.isInteger(product.priceCents)).toBe(true);
      expect(product.priceCents).toBeGreaterThan(0);
    }
  });

  it("n'a aucun identifiant produit en double", () => {
    const ids = SHOP_CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('donne des tailles aux textiles et aucune au tapis de souris', () => {
    expect(findActiveProduct('maillotDvg_2023')?.sizes).toEqual(['S', 'M', 'L', 'XL', 'XXL']);
    expect(findActiveProduct('tapisSourisDvg')?.sizes).toEqual([]);
  });

  it('retourne undefined pour un identifiant inconnu', () => {
    expect(findActiveProduct('produit-inexistant')).toBeUndefined();
  });

  it('ne retourne que les produits actifs', () => {
    expect(getActiveProducts().every((p) => p.active)).toBe(true);
  });
});
