import { ShopSettings } from '../../generated/prisma';
import { orderFee, orderMargin, shippingCost, shippingPrice, unitCost } from './shop-costs';

/**
 * Grille 2026 : maillot 40 €, flocage 5 €, port 5 €, offert des 120 €.
 *
 * Les couts sont ceux du fournisseur letton, **TVA de 21 % comprise** : 16,19 €
 * de fabrication et 9,00 € de port deviennent 19,59 € et 10,89 €. C'est ce
 * montant-la qui sort de la tresorerie, l'association ne recuperant pas cette
 * TVA. Les valeurs de test suivent le reel pour qu'un chiffre de marge lu ici
 * soit celui qu'on lira dans l'administration.
 */
const SETTINGS = {
  id: 1,
  currency: 'eur',
  ordersNotifyEmail: null,
  shopEnabled: true,
  shippingStandardCents: 500,
  freeShippingThresholdCents: 12000,
  costProductionCents: 1959,
  costPartnerCents: 700,
  costPartnerEnabled: false,
  costEcommerceCents: 363,
  costFlockingCents: 0,
  costShippingStandardCents: 1089,
  updatedAt: new Date(),
} as ShopSettings;

describe('unitCost', () => {
  it('somme production et flocage sans le partenaire quand il est inactif', () => {
    const cost = unitCost(SETTINGS);

    expect(cost.partnerCents).toBe(0);
    expect(cost.totalCents).toBe(1959);
  });

  it('ajoute la commission partenaire des qu’elle est activee', () => {
    const cost = unitCost({ ...SETTINGS, costPartnerEnabled: true });

    expect(cost.partnerCents).toBe(700);
    expect(cost.totalCents).toBe(2659);
  });

  it('detaille le cout plutot que de ne donner qu’un total', () => {
    // Un total seul ne se verifie pas : le detail permet de retrouver d'ou
    // vient l'ecart quand un tarif fournisseur bouge.
    const cost = unitCost(SETTINGS);

    expect(cost.productionCents).toBe(1959);
    expect(cost.flockingCents).toBe(0);
  });

  /**
   * Le point de la correction : ce poste etait compte par maillot alors que le
   * fournisseur le facture par commande. Une commande de trois maillots se
   * voyait imputer 10,89 € la ou il en prend 3,63 €.
   */
  it('n’inclut pas les frais de traitement, qui sont dus par commande', () => {
    const cost = unitCost(SETTINGS);

    expect(cost.totalCents).toBe(SETTINGS.costProductionCents);
    expect(cost.totalCents).not.toBe(SETTINGS.costProductionCents + SETTINGS.costEcommerceCents);
  });
});

describe('orderFee', () => {
  it('rend les frais de traitement du fournisseur, une fois par commande', () => {
    expect(orderFee(SETTINGS)).toBe(363);
  });
});

describe('shippingPrice', () => {
  it('facture le port sous le seuil', () => {
    expect(shippingPrice(SETTINGS, 4000)).toBe(500);
  });

  it('offre le port des que le seuil est atteint', () => {
    expect(shippingPrice(SETTINGS, 12000)).toBe(0);
  });

  it('n’offre rien juste sous le seuil', () => {
    expect(shippingPrice(SETTINGS, 11999)).toBe(500);
  });

  it('traite un seuil a zero comme une franchise desactivee, pas comme un port toujours offert', () => {
    const sansFranchise = { ...SETTINGS, freeShippingThresholdCents: 0 };

    expect(shippingPrice(sansFranchise, 100000)).toBe(500);
  });
});

describe('shippingCost', () => {
  it('retient le cout reel du colis, distinct de ce qui est facture', () => {
    expect(shippingCost(SETTINGS)).toBe(1089);
    expect(shippingCost(SETTINGS)).toBeGreaterThan(SETTINGS.shippingStandardCents);
  });
});

describe('orderMargin', () => {
  it('calcule la marge d’un maillot floque avec port standard', () => {
    // 40 € + 5 € de flocage + 5 € de port encaisses. Depenses : 19,59 € de
    // maillot, 10,89 € de colis, 3,63 € de traitement, 1,09 € de commission.
    const margin = orderMargin({
      totalCents: 5000,
      unitCostCents: 1959,
      shippingCostCents: 1089,
      shippingCents: 500,
      totalQuantity: 1,
      orderFeeCents: 363,
      stripeFeeCents: 109,
    });

    expect(margin.totalCostCents).toBe(3520);
    expect(margin.marginCents).toBe(1480);
    expect(margin.marginRate).toBeCloseTo(29.6, 1);
  });

  it('compte les maillots par piece, et le colis comme les frais fixes une seule fois', () => {
    // Trois maillots floques, port offert : c'est le panier ou l'ancien calcul
    // se trompait le plus, en imputant trois fois les frais de traitement.
    const margin = orderMargin({
      totalCents: 13500,
      unitCostCents: 1959,
      shippingCostCents: 1089,
      shippingCents: 0,
      totalQuantity: 3,
      orderFeeCents: 363,
      stripeFeeCents: 237,
    });

    expect(margin.itemsCostCents).toBe(5877);
    expect(margin.shippingCostCents).toBe(1089);
    expect(margin.orderFeeCents).toBe(363);
    expect(margin.totalCostCents).toBe(7566);
    expect(margin.marginCents).toBe(5934);
    expect(margin.marginRate).toBeCloseTo(44.0, 1);
  });

  /**
   * Les commandes anterieures a l'introduction de ces colonnes portent zero.
   * Leur marge est alors surestimee, ce qui se voit et se corrige a la lecture,
   * la ou un montant reconstitue avec les tarifs du jour serait faux sans que
   * personne ne puisse s'en apercevoir.
   */
  it('tolere une commande sans frais fixes connus', () => {
    const margin = orderMargin({
      totalCents: 5000,
      unitCostCents: 1959,
      shippingCostCents: 1089,
      shippingCents: 500,
      totalQuantity: 1,
    });

    expect(margin.orderFeeCents).toBe(0);
    expect(margin.stripeFeeCents).toBe(0);
    expect(margin.totalCostCents).toBe(3048);
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
