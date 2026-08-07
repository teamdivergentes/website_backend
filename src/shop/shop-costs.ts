import { ShippingMethod, ShopSettings } from '../../generated/prisma';

/**
 * Ce qu'une commande rapporte reellement, une fois retire ce qu'elle coute.
 *
 * Deux principes gouvernent ce module :
 *
 * 1. **Les couts ne sortent jamais de l'administration.** Aucun de ces montants
 *    n'a de raison d'apparaitre dans une reponse publique : ils renseignent sur
 *    les marges negociees avec les fournisseurs.
 *
 * 2. **Une marge est une photographie.** Les couts sont figes sur la commande a
 *    l'achat (`unitCostCents`, `shippingCostCents`). Si le tarif du fournisseur
 *    change demain, les commandes d'hier gardent la marge qu'elles ont
 *    reellement degagee ; recalculer avec les couts du jour reecrirait
 *    l'histoire.
 */

/** Le detail d'un cout unitaire, pour pouvoir l'expliquer et non seulement l'afficher. */
export interface UnitCostBreakdown {
  productionCents: number;
  /** 0 quand le partenariat n'est pas actif. */
  partnerCents: number;
  ecommerceCents: number;
  /** Cout fournisseur du flocage, provisionne a 0 tant qu'il est inconnu. */
  flockingCents: number;
  totalCents: number;
}

export interface OrderMargin {
  /** Ce que le client a paye, port compris. */
  revenueCents: number;
  /** Cout des maillots : cout unitaire fige x quantite totale. */
  itemsCostCents: number;
  /** Cout reel du colis, qui n'est pas celui facture au client. */
  shippingCostCents: number;
  totalCostCents: number;
  marginCents: number;
  /** Marge rapportee au chiffre d'affaires, en pourcentage. `null` si CA nul. */
  marginRate: number | null;
  /**
   * Vrai quand le port a coute plus cher qu'il n'a ete facture.
   *
   * ⚠️ **Constant a vrai avec la tarification actuelle** : 5,00 EUR factures
   * pour 9,00 EUR de colis en standard, 10,00 EUR pour 12,00 EUR en express, et
   * gratuit au-dela de la franchise. C'est un choix assume — le tarif affiche
   * est volontairement bas et l'ecart est amorti par le prix du maillot — et
   * non un incident.
   *
   * Il n'est donc pas presente comme une alerte a l'administration : un drapeau
   * vrai sur 100 % des commandes n'apprend rien. `marginCents` porte le
   * resultat reel, port compris, et reste le seul chiffre a surveiller.
   *
   * Ne redeviendra discriminant que le jour ou le port sera tarife par zone.
   */
  shippingSoldAtLoss: boolean;
}

/** Ce que coute un maillot a la structure, avant expedition. */
export function unitCost(settings: ShopSettings): UnitCostBreakdown {
  const partnerCents = settings.costPartnerEnabled ? settings.costPartnerCents : 0;

  return {
    productionCents: settings.costProductionCents,
    partnerCents,
    ecommerceCents: settings.costEcommerceCents,
    flockingCents: settings.costFlockingCents,
    totalCents:
      settings.costProductionCents +
      partnerCents +
      settings.costEcommerceCents +
      settings.costFlockingCents,
  };
}

/** Ce que coute reellement un colis, selon le mode retenu par le client. */
export function shippingCost(settings: ShopSettings, method: ShippingMethod): number {
  return method === 'EXPRESS'
    ? settings.costShippingExpressCents
    : settings.costShippingStandardCents;
}

/** Ce qui est facture au client pour la livraison, franchise appliquee. */
export function shippingPrice(
  settings: ShopSettings,
  method: ShippingMethod,
  subtotalCents: number,
): number {
  // Un seuil a zero desactive la franchise plutot que d'offrir tout le temps :
  // c'est l'interpretation la moins surprenante pour qui vide le champ.
  const threshold = settings.freeShippingThresholdCents;
  if (threshold > 0 && subtotalCents >= threshold) {
    return 0;
  }

  return method === 'EXPRESS' ? settings.shippingExpressCents : settings.shippingStandardCents;
}

/**
 * Prix unitaire au tarif reserve : ce que la piece coute reellement a la
 * structure, hors expedition.
 *
 * Reprend les memes postes que `unitCost`, a une difference pres : le cout du
 * flocage n'est compte que si un flocage est effectivement demande. `unitCost`
 * l'ajoute inconditionnellement parce qu'il sert a figer un cout moyen sur la
 * commande ; ici on facture, et facturer un flocage a qui n'en veut pas serait
 * faux. Ce cout vaut 0 tant que le fournisseur n'a pas donne son tarif — la
 * distinction est donc sans effet aujourd'hui, et juste demain.
 *
 * ⚠️ Ces montants vivent dans `ShopSettings`, pas sur le produit : **tous les
 * articles ont donc le meme prix coutant**. C'est exact tant que le catalogue
 * ne contient que des maillots de meme facture. Un article a la structure de
 * cout differente — un hoodie, un accessoire — imposera un montant par produit.
 */
export function retailUnitPrice(settings: ShopSettings, options: { flocked: boolean }): number {
  const partnerCents = settings.costPartnerEnabled ? settings.costPartnerCents : 0;
  const flockingCents = options.flocked ? settings.costFlockingCents : 0;

  return settings.costProductionCents + partnerCents + settings.costEcommerceCents + flockingCents;
}

/**
 * Marge d'une commande, a partir des couts qu'elle a figes.
 *
 * `totalQuantity` est le nombre de maillots, toutes lignes confondues : le cout
 * de production se compte par piece, alors que le colis se compte une fois.
 */
export function orderMargin(input: {
  totalCents: number;
  unitCostCents: number;
  shippingCostCents: number;
  shippingCents: number;
  totalQuantity: number;
}): OrderMargin {
  const itemsCostCents = input.unitCostCents * input.totalQuantity;
  const totalCostCents = itemsCostCents + input.shippingCostCents;
  const marginCents = input.totalCents - totalCostCents;

  return {
    revenueCents: input.totalCents,
    itemsCostCents,
    shippingCostCents: input.shippingCostCents,
    totalCostCents,
    marginCents,
    marginRate:
      input.totalCents > 0 ? Math.round((marginCents / input.totalCents) * 1000) / 10 : null,
    shippingSoldAtLoss: input.shippingCostCents > input.shippingCents,
  };
}
