import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShopSettingsService } from './shop-settings.service';
import { assertFlockingAllowed, normalizeFlocking } from './shop-flocking';
import { CheckoutItemDto } from './dto/create-checkout.dto';
import { orderFee, retailUnitPrice, shippingCost, shippingPrice, unitCost } from './shop-costs';
import { applicableUnitPrice } from './shop-discount';
import { AppliedDiscount, ShopDiscountService } from './shop-discount.service';
import { PricingTier, ShippingMethod } from '../../generated/prisma';
import { OutOfStockException, OutOfStockItem } from './shop-stock.exception';

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
  /** Prix unitaire facture, hors flocage. Le prix promotionnel s'il est actif. */
  unitPriceCents: number;
  /**
   * Prix catalogue unitaire, promotion ignoree. C'est le prix barre de la
   * vitrine ; egal a `unitPriceCents` hors promotion.
   */
  listUnitPriceCents: number;
  /** Surcout unitaire de flocage, 0 si pas de flocage. */
  flockingFeeCents: number;
  lineTotalCents: number;
  /** Ce que la ligne aurait coute au tarif public du jour. Egal au total au tarif public. */
  publicLineTotalCents: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotalCents: number;
  /**
   * Ce que le bon de reduction retire, 0 quand il n'y en a pas.
   *
   * Toujours un nombre et jamais `null` : le reporting somme sans cas
   * particulier, et une commande sans remise en porte zero.
   */
  discountCents: number;
  /** Le code retenu, absent quand le panier n'en porte pas. */
  discount?: AppliedDiscount;
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
  /**
   * Frais de traitement du fournisseur, dus une fois pour la commande entiere.
   * Separe de `unitCostCents`, qui est multiplie par la quantite.
   */
  orderFeeCents: number;
  /** Bareme retenu, tel qu'il sera fige sur la commande. */
  tier: PricingTier;
  /**
   * Ce que le meme panier aurait coute au tarif public du jour, port compris.
   * Egal a `totalCents` au tarif public. Sur une vente a prix coutant, c'est la
   * seule trace exploitable de l'avantage consenti : le catalogue est
   * modifiable a chaud, le prix d'aujourd'hui n'est pas celui de la commande.
   *
   * ⚠️ « Tarif public » veut bien dire le prix qu'un client ordinaire aurait
   * paye ce jour-la, **promotion comprise** : une promotion est ouverte a tout
   * le monde, elle n'est consentie a personne en particulier. Y ignorer les
   * promotions gonflerait l'avantage attribue aux ventes a prix coutant de
   * toutes les remises commerciales en cours.
   */
  publicTotalCents: number;
}

@Injectable()
export class ShopPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: ShopSettingsService,
    private readonly discounts: ShopDiscountService,
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
   *
   * `discountCode` est la seule saisie client qui touche au prix, et elle ne
   * fait pas exception a l'invariant : c'est une **chaine a resoudre**, pas un
   * montant a croire.
   *
   * **Ordre de calcul**, ecrit noir sur blanc parce que chaque permutation
   * donne un total different : prix catalogue, puis prix promotionnel, puis
   * bon de reduction, puis port. Un desaccord entre le montant affiche au
   * panier et celui envoye a Stripe est une reclamation client, pas un defaut
   * de rendu.
   */
  async priceCart(input: {
    items: CheckoutItemDto[];
    tier: PricingTier;
    discountCode?: string;
    /** Injectable pour les tests ; l'appelant reel ne la fournit pas. */
    now?: Date;
  }): Promise<PricedCart> {
    const { items, tier, discountCode } = input;
    const now = input.now ?? new Date();
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

    // Ecarts de stock releves pendant la construction des lignes. Collectes a
    // part plutot que de rejeter des la premiere : un panier a plusieurs
    // lignes en rupture merite un seul rapport complet, pas un aller-retour
    // par ligne fautive.
    const outOfStock: OutOfStockItem[] = [];

    const lines = items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new BadRequestException('Produit introuvable ou indisponible');
      }

      const size = product.sizes.find((candidate) => candidate.label === item.size);
      if (!size) {
        throw new BadRequestException(`Taille indisponible pour « ${product.name} »`);
      }

      // Stock `null` = non gere, illimite : c'est le comportement d'avant
      // cette colonne. Un stock gere insuffisant ferme le panier ici, AVANT
      // tout appel a Stripe ; aucune reservation n'est prise, le decompte
      // reel n'a lieu qu'au paiement confirme (webhook).
      if (typeof size.stock === 'number' && item.quantity > size.stock) {
        outOfStock.push({
          productId: product.id,
          sizeId: size.id,
          size: size.label,
          requested: item.quantity,
          available: size.stock,
        });
      }

      const flockingText = normalizeFlocking(item.flockingText);
      assertFlockingAllowed(flockingText, product);

      // Le surcout n'est facture que si un flocage est effectivement demande :
      // « il est egalement possible de ne rien mettre ».
      const flocked = flockingText !== null;

      // Au tarif reserve, le prix ET le surcout de flocage sont remplaces par
      // leur cout reel. Le prix public reste calcule en parallele : c'est lui
      // qui sera fige comme reference de l'avantage consenti.
      //
      // Le prix public du jour est le prix promotionnel quand une promotion
      // court, le prix catalogue sinon. La promotion ne touche pas le surcout
      // de flocage : les deux montants restent distincts jusqu'au total de
      // ligne.
      const publicUnitCents = applicableUnitPrice(product, now);
      const publicFlockingCents = flocked ? product.flockingFeeCents : 0;

      // Le cout du flocage est celui du fournisseur, et il n'est du que si un
      // flocage est demande.
      const retailFlockingCents = flocked ? settings.costFlockingCents : 0;

      const isRetail = tier === 'RETAIL';
      const unitPriceCents = isRetail
        ? retailUnitPrice(settings, { flocked: false })
        : publicUnitCents;
      const flockingFeeCents = isRetail ? retailFlockingCents : publicFlockingCents;

      return {
        productId: product.id,
        productName: product.name,
        size: item.size,
        flockingText,
        quantity: item.quantity,
        unitPriceCents,
        listUnitPriceCents: product.priceCents,
        flockingFeeCents,
        lineTotalCents: (unitPriceCents + flockingFeeCents) * item.quantity,
        publicLineTotalCents: (publicUnitCents + publicFlockingCents) * item.quantity,
      };
    });

    if (outOfStock.length > 0) {
      throw new OutOfStockException(outOfStock);
    }

    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const publicSubtotalCents = lines.reduce((sum, line) => sum + line.publicLineTotalCents, 0);

    // Aucune remise par-dessus le tarif reserve. Sa marge est nulle par
    // construction : lui retirer quoi que ce soit revient a vendre sous le
    // cout. Le refus est explicite plutot que silencieux — un code ignore sans
    // rien dire ferait croire a un defaut de saisie.
    if (discountCode && tier === 'RETAIL') {
      throw new BadRequestException("Un bon de réduction ne s'applique pas au tarif réservé");
    }

    const discount = discountCode
      ? await this.discounts.resolveForCart(discountCode, subtotalCents, now)
      : undefined;
    const discountCents = discount?.amountCents ?? 0;

    // Le port se compte une fois par colis, pas par article, et s'efface
    // au-dela du seuil de franchise.
    //
    // La franchise s'evalue sur le sous-total **avant remise** : sinon un bon
    // de reduction ferait reapparaitre des frais de port que le client voyait
    // offerts, et l'ecran lui annoncerait une reduction qui lui coute de
    // l'argent.
    //
    // Au tarif reserve, c'est le cout reel du colis qui est facture, et la
    // franchise ne s'applique pas. Deux raisons : le principe est de payer le
    // vrai prix, et un panier calcule au coutant n'atteindrait le seuil de
    // franchise que par accident de calcul. Offrir le port par-dessus un prix
    // deja sans marge reviendrait a vendre sous le cout.
    const shippingCents =
      tier === 'RETAIL' ? shippingCost(settings) : shippingPrice(settings, subtotalCents);

    // Frais de traitement du fournisseur : une fois par commande, jamais par
    // article. Au tarif reserve ils sont refactures, comme le reste du cout
    // reel — mais une seule fois, ce qui est precisement leur nature.
    const orderFeeCents = orderFee(settings);
    const retailOrderFeeCents = tier === 'RETAIL' ? orderFeeCents : 0;

    const totalCents = subtotalCents - discountCents + shippingCents + retailOrderFeeCents;

    // Les couts sont editables depuis l'administration. Tous a zero, le total
    // tombe a zero, Stripe repond `no_payment_required` et la commande est
    // consideree payee : un endpoint « commande gratuite ». Le plancher ferme
    // ce chemin, quelle que soit la saisie en reglages.
    if (tier === 'RETAIL' && totalCents < STRIPE_MINIMUM_CENTS) {
      throw new BadRequestException(
        'Le tarif réservé est mal configuré : le total est inférieur au minimum encaissable',
      );
    }

    // Le meme chemin, ouvert cette fois depuis le tunnel public : un code a
    // 100 %, ou une remise fixe superieure a un petit panier, ramene le total
    // sous le minimum encaissable. Le refus porte sur le total apres remise,
    // quel que soit le bareme.
    if (totalCents < STRIPE_MINIMUM_CENTS) {
      throw new BadRequestException(
        `Le total après réduction est inférieur au minimum encaissable (${(
          STRIPE_MINIMUM_CENTS / 100
        )
          .toFixed(2)
          .replace('.', ',')} €)`,
      );
    }

    return {
      lines,
      subtotalCents,
      discountCents,
      discount,
      shippingCents,
      totalCents,
      currency: settings.currency,
      shippingMethod: 'STANDARD',
      shippingIsFree: shippingCents === 0,
      unitCostCents: unitCost(settings).totalCents,
      shippingCostCents: shippingCost(settings),
      orderFeeCents,
      tier,
      // Le port public entre dans la reference : l'avantage porte sur la
      // commande entiere, pas seulement sur les articles.
      //
      // La remise en est deduite pour la meme raison que la promotion y est
      // integree : un bon de reduction est accessible a qui le detient, ce
      // n'est pas un tarif consenti a une personne. C'est ce qui maintient
      // l'egalite `publicTotalCents === totalCents` sur une vente publique.
      publicTotalCents:
        publicSubtotalCents - discountCents + shippingPrice(settings, publicSubtotalCents),
    };
  }
}
