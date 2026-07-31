import { ShopSettings } from '../../generated/prisma';
import { orderMargin, shippingCost, shippingPrice, unitCost } from './shop-costs';

/** Grille 2026 : maillot 40 €, flocage 5 €, port 5 € / 10 €, offert des 120 €. */
const SETTINGS = {
  id: 1,
  currency: 'eur',
  ordersNotifyEmail: null,
  shopEnabled: true,
  shippingStandardCents: 500,
  shippingExpressCents: 1000,
  freeShippingThresholdCents: 12000,
  costProductionCents: 1600,
  costPartnerCents: 700,
  costPartnerEnabled: false,
  costEcommerceCents: 300,
  costFlockingCents: 0,
  costShippingStandardCents: 900,
  costShippingExpressCents: 1200,
  updatedAt: new Date(),
} as ShopSettings;

describe('unitCost', () => {
  it('somme production, ecommerce et flocage sans le partenaire quand il est inactif', () => {
    const cost = unitCost(SETTINGS);

    expect(cost.partnerCents).toBe(0);
    expect(cost.totalCents).toBe(1900);
  });

  it('ajoute la commission partenaire des qu’elle est activee', () => {
    const cost = unitCost({ ...SETTINGS, costPartnerEnabled: true });

    expect(cost.partnerCents).toBe(700);
    expect(cost.totalCents).toBe(2600);
  });

  it('detaille le cout plutot que de ne donner qu’un total', () => {
    // Un total seul ne se verifie pas : le detail permet de retrouver d'ou
    // vient l'ecart quand un tarif fournisseur bouge.
    const cost = unitCost(SETTINGS);

    expect(cost.productionCents).toBe(1600);
    expect(cost.ecommerceCents).toBe(300);
    expect(cost.flockingCents).toBe(0);
  });
});

describe('shippingPrice', () => {
  it('facture le tarif du mode retenu sous le seuil', () => {
    expect(shippingPrice(SETTINGS, 'STANDARD', 4000)).toBe(500);
    expect(shippingPrice(SETTINGS, 'EXPRESS', 4000)).toBe(1000);
  });

  it('offre le port des que le seuil est atteint, quel que soit le mode', () => {
    expect(shippingPrice(SETTINGS, 'STANDARD', 12000)).toBe(0);
    expect(shippingPrice(SETTINGS, 'EXPRESS', 12000)).toBe(0);
  });

  it('n’offre rien juste sous le seuil', () => {
    expect(shippingPrice(SETTINGS, 'STANDARD', 11999)).toBe(500);
  });

  it('traite un seuil a zero comme une franchise desactivee, pas comme un port toujours offert', () => {
    const sansFranchise = { ...SETTINGS, freeShippingThresholdCents: 0 };

    expect(shippingPrice(sansFranchise, 'STANDARD', 100000)).toBe(500);
  });
});

describe('shippingCost', () => {
  it('retient le cout reel du mode, distinct de ce qui est facture', () => {
    expect(shippingCost(SETTINGS, 'STANDARD')).toBe(900);
    expect(shippingCost(SETTINGS, 'EXPRESS')).toBe(1200);
  });
});

describe('orderMargin', () => {
  it('calcule la marge d’un maillot seul avec port standard', () => {
    // 40 € + 5 € de port encaisses, 19 € de maillot + 9 € de port depenses.
    const margin = orderMargin({
      totalCents: 4500,
      unitCostCents: 1900,
      shippingCostCents: 900,
      shippingCents: 500,
      totalQuantity: 1,
    });

    expect(margin.totalCostCents).toBe(2800);
    expect(margin.marginCents).toBe(1700);
    expect(margin.marginRate).toBeCloseTo(37.8, 1);
  });

  it('compte le cout des maillots par piece et le colis une seule fois', () => {
    const margin = orderMargin({
      totalCents: 12000,
      unitCostCents: 1900,
      shippingCostCents: 900,
      shippingCents: 0,
      totalQuantity: 3,
    });

    expect(margin.itemsCostCents).toBe(5700);
    expect(margin.shippingCostCents).toBe(900);
    expect(margin.marginCents).toBe(5400);
  });

  it('signale que le port est vendu a perte', () => {
    const margin = orderMargin({
      totalCents: 4500,
      unitCostCents: 1900,
      shippingCostCents: 900,
      shippingCents: 500,
      totalQuantity: 1,
    });

    expect(margin.shippingSoldAtLoss).toBe(true);
  });

  it('rend une marge negative telle quelle plutot que de la masquer', () => {
    // Commission partenaire active, un seul maillot, port offert : la commande
    // perd de l'argent. L'afficher est tout l'interet de l'indicateur.
    const margin = orderMargin({
      totalCents: 4000,
      unitCostCents: 2600,
      shippingCostCents: 900,
      shippingCents: 0,
      totalQuantity: 1,
    });

    expect(margin.marginCents).toBe(500);
    expect(margin.shippingSoldAtLoss).toBe(true);
  });

  it('ne divise pas par zero sur une commande a montant nul', () => {
    const margin = orderMargin({
      totalCents: 0,
      unitCostCents: 1900,
      shippingCostCents: 0,
      shippingCents: 0,
      totalQuantity: 0,
    });

    expect(margin.marginRate).toBeNull();
  });
});
