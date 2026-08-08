import { PricedCart } from '../shop-pricing.service';

/**
 * Ce que le panier affiche avant paiement.
 *
 * Projection **restrictive** du panier tarife : les couts fournisseur, les
 * frais de traitement et le cout reel du colis n'ont rien a faire dans une
 * reponse publique — ils renseignent sur les marges negociees. Enumerer ce qui
 * sort, plutot que retirer ce qui ne doit pas sortir, est ce qui garantit
 * qu'un champ ajoute demain au panier tarife ne fuite pas par inadvertance.
 */
export interface CartQuote {
  lines: CartQuoteLine[];
  subtotalCents: number;
  discountCents: number;
  /** Le code retenu, absent quand le panier n'en porte pas. */
  discountCode?: string;
  shippingCents: number;
  shippingIsFree: boolean;
  totalCents: number;
  currency: string;
}

export interface CartQuoteLine {
  productId: number;
  productName: string;
  size: string;
  flockingText: string | null;
  quantity: number;
  unitPriceCents: number;
  /** Prix catalogue, a barrer quand il differe du prix facture. */
  listUnitPriceCents: number;
  flockingFeeCents: number;
  lineTotalCents: number;
}

export function toCartQuote(cart: PricedCart): CartQuote {
  return {
    lines: cart.lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      size: line.size,
      flockingText: line.flockingText,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      listUnitPriceCents: line.listUnitPriceCents,
      flockingFeeCents: line.flockingFeeCents,
      lineTotalCents: line.lineTotalCents,
    })),
    subtotalCents: cart.subtotalCents,
    discountCents: cart.discountCents,
    discountCode: cart.discount?.code,
    shippingCents: cart.shippingCents,
    shippingIsFree: cart.shippingIsFree,
    totalCents: cart.totalCents,
    currency: cart.currency,
  };
}
