import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShopSettingsService } from './shop-settings.service';
import { assertFlockingAllowed, normalizeFlocking } from './shop-flocking';
import { CheckoutItemDto } from './dto/create-checkout.dto';
import { retailUnitPrice, shippingCost, shippingPrice, unitCost } from './shop-costs';
import { PricingTier, ShippingMethod } from '../../generated/prisma';

/** Nombre total d'articles accepte dans un panier, toutes lignes confondues. */
export const MAX_CART_ITEMS = 20;

/**
 * Plafond propre au tarif reserve, bien plus bas que le plafond public.
 *
 * Vingt maillots au prix coutant en une commande n'a pas de sens : ce tarif
 * equipe une personne, il n'approvisionne pas une revente. Le plafond est une
 * borne, pas un quota — il ne dit rien du nombre de commandes dans l'annee.
 */
export const MAX_RETAIL_ITEMS = 3;

/** Ce que Stripe refuse d'encaisser : 0,50 € pour l'euro. */
export const STRIPE_MINIMUM_CENTS = 50;

export interface PricedLine {
  productId: number;
  productName: string;
  size: string;
  flockingText: string | null;
  quantity: number;
  /** Prix catalogue unitaire, hors flocage. */
  unitPriceCents: number;
  /** Surcout unitaire de flocage, 0 si pas de flocage. */
  flockingFeeCents: number;
  lineTotalCents: number;
  /** Ce que la ligne aurait coute au prix catalogue. Egal au total au tarif public. */
  publicLineTotalCents: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  shippingMethod: ShippingMethod;
  /** Vrai quand la franchise de port s'est appliquee. */
  shippingIsFree: boolean;
  /**
   * Couts a figer sur la commande. Ils ne doivent jamais quitter le serveur
   * vers un client public : ils renseignent sur les marges fournisseurs.
   */
  unitCostCents: number;
  shippingCostCents: number;
  /** Bareme retenu, tel qu'il sera fige sur la commande. */
  tier: PricingTier;
  /**
   * Ce que le meme panier aurait coute au prix catalogue, port public compris.
   * Egal a `totalCents` au tarif public. Sur une vente a prix coutant, c'est la
   * seule trace exploitable de l'avantage consenti : le catalogue est
   * modifiable a chaud, le prix d'aujourd'hui n'est pas celui de la commande.
   */
  publicTotalCents: number;
}

@Injectable()
export class ShopPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: ShopSettingsService,
  ) {}

  /**
   * Transforme un panier client en panier tarife.
   *
   * Invariant central de la boutique : **aucun montant n'est lu depuis la
   * requete**. Le client ne transmet que des identifiants, des tailles, des
   * quantites et un texte de flocage ; tous les prix sont resolus depuis la
   * base. Sans cela, un panier forge permet d'acheter un maillot a 0,01 €.
   *
   * Le corollaire vaut pour le bareme : `tier` est **obligatoire et sans
   * valeur par defaut**. Il est decide par l'appelant a partir de l'identite
   * authentifiee, jamais du corps de la requete. Un defaut ici rendrait un
   * oubli invisible a la compilation, et le sens de ce defaut deciderait de la
   * gravite de l'oubli.
   */
  async priceCart(input: {
    items: CheckoutItemDto[];
    method: ShippingMethod;
    tier: PricingTier;
  }): Promise<PricedCart> {
    const { items, method, tier } = input;
    const settings = await this.settings.get();
    if (!settings.shopEnabled) {
      throw new ForbiddenException('La boutique est actuellement fermée');
    }

    if (items.length === 0) {
      throw new BadRequestException('Le panier est vide');
    }

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const maxItems = tier === 'RETAIL' ? MAX_RETAIL_ITEMS : MAX_CART_ITEMS;
    if (totalQuantity > maxItems) {
      throw new BadRequestException(`Un panier ne peut pas dépasser ${maxItems} articles`);
    }

    const products = await this.prisma.shopProduct.findMany({
      where: { id: { in: items.map((item) => item.productId) }, active: true },
      include: { sizes: true },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    const lines = items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new BadRequestException('Produit introuvable ou indisponible');
      }

      if (!product.sizes.some((size) => size.label === item.size)) {
        throw new BadRequestException(`Taille indisponible pour « ${product.name} »`);
      }

      const flockingText = normalizeFlocking(item.flockingText);
      assertFlockingAllowed(flockingText, product);

      // Le surcout n'est facture que si un flocage est effectivement demande :
      // « il est egalement possible de ne rien mettre ».
      const flocked = flockingText !== null;

      // Au tarif reserve, le prix ET le surcout de flocage sont remplaces par
      // leur cout reel. Le prix catalogue reste calcule en parallele : c'est
      // lui qui sera fige comme reference de l'avantage consenti.
      const publicUnitCents = product.priceCents;
      const publicFlockingCents = flocked ? product.flockingFeeCents : 0;

      const unitPriceCents =
        tier === 'RETAIL' ? retailUnitPrice(settings, { flocked: false }) : publicUnitCents;
      const flockingFeeCents =
        tier === 'RETAIL' ? (flocked ? settings.costFlockingCents : 0) : publicFlockingCents;

      return {
        productId: product.id,
        productName: product.name,
        size: item.size,
        flockingText,
        quantity: item.quantity,
        unitPriceCents,
        flockingFeeCents,
        lineTotalCents: (unitPriceCents + flockingFeeCents) * item.quantity,
        publicLineTotalCents: (publicUnitCents + publicFlockingCents) * item.quantity,
      };
    });

    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const publicSubtotalCents = lines.reduce((sum, line) => sum + line.publicLineTotalCents, 0);

    // Le port se compte une fois par colis, pas par article, et s'efface
    // au-dela du seuil de franchise.
    //
    // Au tarif reserve, c'est le cout reel du colis qui est facture, et la
    // franchise ne s'applique pas. Deux raisons : le principe est de payer le
    // vrai prix, et un panier calcule au coutant n'atteindrait le seuil de
    // franchise que par accident de calcul. Offrir le port par-dessus un prix
    // deja sans marge reviendrait a vendre sous le cout.
    const shippingCents =
      tier === 'RETAIL'
        ? shippingCost(settings, method)
        : shippingPrice(settings, method, subtotalCents);

    const totalCents = subtotalCents + shippingCents;

    // Les couts sont editables depuis l'administration. Tous a zero, le total
    // tombe a zero, Stripe repond `no_payment_required` et la commande est
    // consideree payee : un endpoint « commande gratuite ». Le plancher ferme
    // ce chemin, quelle que soit la saisie en reglages.
    if (tier === 'RETAIL' && totalCents < STRIPE_MINIMUM_CENTS) {
      throw new BadRequestException(
        'Le tarif réservé est mal configuré : le total est inférieur au minimum encaissable',
      );
    }

    return {
      lines,
      subtotalCents,
      shippingCents,
      totalCents,
      currency: settings.currency,
      shippingMethod: method,
      shippingIsFree: shippingCents === 0,
      unitCostCents: unitCost(settings).totalCents,
      shippingCostCents: shippingCost(settings, method),
      tier,
      // Le port public entre dans la reference : l'avantage porte sur la
      // commande entiere, pas seulement sur les articles.
      publicTotalCents: publicSubtotalCents + shippingPrice(settings, method, publicSubtotalCents),
    };
  }
}
