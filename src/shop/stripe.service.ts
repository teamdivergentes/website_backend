import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { SHIPPING_COUNTRIES, SHIPPING_DISPLAY_NAME } from './shop-shipping-zone';

/**
 * Moyens de paiement proposes au client, arretes ici plutot que laisses a la
 * configuration dynamique du tableau de bord Stripe.
 *
 * Sans cette liste, Stripe applique les « methodes de paiement automatiques »
 * : la page de paiement propose alors tout ce qui est actif sur le compte, et
 * une case cochee par erreur dans le tableau de bord change le tunnel de vente
 * sans qu'aucune ligne de code ne bouge. La liste explicite fait de ce choix
 * une decision versionnee.
 *
 * **Apple Pay et Google Pay ne sont pas des entrees de cette liste.** Ce sont
 * des portefeuilles adosses a `card` : Stripe les affiche de lui-meme quand
 * l'appareil et le navigateur du client les supportent. Les demander
 * separement est impossible, et les retirer l'est tout autant — accepter la
 * carte, c'est accepter ses portefeuilles.
 *
 * Meme remarque pour Link, le portefeuille de Stripe : il se desactive
 * uniquement depuis le tableau de bord, pas depuis cet appel.
 *
 * Klarna suppose que la methode soit activee sur le compte et que la devise
 * et le pays de facturation la supportent ; a defaut, Stripe la masque
 * silencieusement plutot que d'echouer.
 */
const PAYMENT_METHOD_TYPES: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [
  'card',
  'paypal',
  'klarna',
];

/**
 * Prenom et nom demandes separement sur la page de paiement.
 *
 * Stripe ne collecte qu'un seul champ « nom complet », dans le bloc d'adresse.
 * Nous en tirions le prenom en prenant le premier mot, ce qui se trompe des
 * que le client saisit « Dupont Jean », un pseudo, ou un prenom compose : le
 * courriel de confirmation s'ouvrait alors sur un « Bonjour Dupont ». Deux
 * champs distincts suppriment la devinette.
 *
 * Ils s'ajoutent au champ nom de l'adresse de livraison, qu'ils ne remplacent
 * pas : Stripe ne permet pas de scinder celui-ci. Le client saisit donc son
 * identite deux fois, ce qui est le prix de l'exactitude sur l'etiquette
 * d'expedition comme dans nos courriels.
 */
const IDENTITY_FIELD_MAX_LENGTH = 60;

const IDENTITY_CUSTOM_FIELDS: Stripe.Checkout.SessionCreateParams.CustomField[] = [
  {
    key: 'prenom',
    label: { type: 'custom', custom: 'Prénom' },
    type: 'text',
    optional: false,
    text: { maximum_length: IDENTITY_FIELD_MAX_LENGTH },
  },
  {
    key: 'nom',
    label: { type: 'custom', custom: 'Nom' },
    type: 'text',
    optional: false,
    text: { maximum_length: IDENTITY_FIELD_MAX_LENGTH },
  },
];

export interface CheckoutLine {
  /** Libelle affiche sur la page Stripe et sur le recu client. */
  label: string;
  unitAmountCents: number;
  quantity: number;
}

/**
 * Ce que Stripe sait d'une session de paiement.
 * - `paid` : le paiement a abouti, meme si notre webhook ne l'a jamais vu
 * - `unpaid` : la session est close sans paiement, plus rien ne peut aboutir
 * - `unknown` : Stripe n'a pas repondu, ou la session peut encore aboutir
 */
export type CheckoutSessionOutcome = 'paid' | 'unpaid' | 'unknown';

/**
 * Ajoute a l'URL de retour le seul lien entre le tunnel de paiement et le site.
 *
 * Stripe substitue `{CHECKOUT_SESSION_ID}` par l'identifiant reel au moment de
 * la redirection : c'est ce qui permet a la page de remerciement de retrouver
 * la commande et de nommer le client. Sans lui, la redirection est anonyme et
 * la page ne peut afficher qu'un message generique.
 *
 * Concatenation manuelle plutot que `URL.searchParams` : ce dernier encode les
 * accolades en `%7B…%7D`, et Stripe ne substitue alors plus rien — le site
 * recevrait le placeholder en toutes lettres. L'URL vient d'une variable
 * d'environnement qui peut deja porter une chaine de requete, d'ou le choix du
 * separateur.
 */
export function withSessionPlaceholder(url: string): string {
  if (url.includes('{CHECKOUT_SESSION_ID}')) {
    return url;
  }
  return `${url}${url.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
}

/**
 * Duree de vie d'une session de paiement.
 *
 * Stripe accepte de 30 minutes a 24 heures, et retient 24 heures par defaut.
 * Une heure est retenue ici pour une raison qui n'a rien a voir avec le
 * paiement : une session ouverte **reserve** le bon de reduction qu'elle porte
 * (cf. `ShopDiscountService`). Au defaut de Stripe, un panier abandonne
 * rendrait un code a usage unique indisponible pour la journee entiere. Une
 * heure laisse largement le temps de saisir une carte.
 */
export const CHECKOUT_SESSION_TTL_MINUTES = 60;

export interface CheckoutSessionParams {
  lines: CheckoutLine[];
  shippingCents: number;
  currency: string;
  /** Remise a appliquer au sous-total articles, 0 quand il n'y en a pas. */
  discountCents: number;
  /** Libelle du code, affiche au client sur la page de paiement. */
  discountLabel?: string;
  /**
   * Echeance de la session, decidee par l'appelant.
   *
   * Elle ne se calcule pas ici parce que la commande doit la porter **avant**
   * l'appel a Stripe : c'est cette echeance qui reserve le bon de reduction, et
   * une reservation qui n'existerait qu'au retour de Stripe laisserait le code
   * disponible pour un autre client pendant tout l'aller-retour.
   */
  expiresAt: Date;
  metadata: Record<string, string>;
}

/** Echeance d'une session creee maintenant. */
export function checkoutSessionExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + CHECKOUT_SESSION_TTL_MINUTES * 60_000);
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private client: Stripe | null = null;

  private getClient(): Stripe {
    if (!this.client) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        this.logger.error('STRIPE_SECRET_KEY absente : la boutique ne peut pas fonctionner');
        throw new InternalServerErrorException('Paiement indisponible');
      }
      this.client = new Stripe(secretKey);
    }
    return this.client;
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<{ id: string; url: string }> {
    const successUrl = withSessionPlaceholder(
      process.env.SHOP_SUCCESS_URL ?? 'http://localhost:4200/boutique/merci',
    );
    const cancelUrl = process.env.SHOP_CANCEL_URL ?? 'http://localhost:4200/boutique/panier';

    const discounts = params.discountCents > 0 ? [await this.createCoupon(params)] : undefined;

    const session = await this.getClient().checkout.sessions.create({
      expires_at: Math.floor(params.expiresAt.getTime() / 1000),
      discounts,
      mode: 'payment',
      payment_method_types: PAYMENT_METHOD_TYPES,
      custom_fields: IDENTITY_CUSTOM_FIELDS,
      line_items: params.lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: params.currency,
          unit_amount: line.unitAmountCents,
          product_data: { name: line.label },
        },
      })),
      // Zone de livraison europeenne, definie en un seul endroit. Le tarif du
      // transporteur est unifie sur toute la zone — un colis pour Helsinki
      // coute au fournisseur exactement ce que coute un colis pour Strasbourg :
      // ouvrir l'Europe ne degrade donc aucune marge par la distance.
      shipping_address_collection: { allowed_countries: [...SHIPPING_COUNTRIES] },
      // Tarif inline plutot qu'un shipping_rate pre-cree dans Stripe : le
      // montant vit en base et doit pouvoir changer depuis l'admin sans
      // resynchroniser un objet Stripe.
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: params.shippingCents, currency: params.currency },
            display_name: SHIPPING_DISPLAY_NAME,
          },
        },
      ],
      metadata: params.metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new InternalServerErrorException('Session de paiement invalide');
    }
    return { id: session.id, url: session.url };
  }

  /**
   * Coupon a usage unique, cree pour cette session et pour elle seule.
   *
   * **Pourquoi un coupon plutot qu'une remise repartie sur les prix
   * unitaires.** Stripe n'accepte pas de ligne negative : deduire la remise
   * de nos propres montants obligerait a la repartir au prorata sur chaque
   * ligne, avec un reste d'arrondi a rattraper a l'unite pres, et le client
   * verrait sur son recu des prix unitaires qui ne sont ni ceux du catalogue
   * ni ceux annonces au panier. Le coupon donne le montant exact et une ligne
   * de reduction lisible avant le paiement, ce que le critere d'acceptation
   * demande.
   *
   * **Ce n'est pas la synchronisation d'objets Stripe qu'on avait ecartee**
   * pour les frais de port. Le tarif de port est un reglage durable, edite
   * depuis l'administration : le pre-creer chez Stripe aurait cree une seconde
   * source de verite a resynchroniser a chaque changement. Ce coupon-ci nait
   * avec la session, ne vaut que pour elle, et sa valeur est calculee chez
   * nous a l'instant ou il est cree. Il n'y a rien a maintenir en accord.
   *
   * `max_redemptions: 1` et `redeem_by` sont des garde-fous : meme si le
   * couponnage fuitait, il ne servirait qu'une fois et pas au-dela de la
   * session.
   */
  private async createCoupon(params: CheckoutSessionParams): Promise<{ coupon: string }> {
    const coupon = await this.getClient().coupons.create({
      amount_off: params.discountCents,
      currency: params.currency,
      duration: 'once',
      max_redemptions: 1,
      redeem_by: Math.floor(params.expiresAt.getTime() / 1000),
      name: params.discountLabel ? `Code ${params.discountLabel}` : 'Réduction',
    });
    return { coupon: coupon.id };
  }

  /**
   * Verdict de Stripe sur une session de paiement.
   * `unknown` n'est pas une erreur mais une abstention : l'appelant ne doit
   * alors rien detruire.
   */
  async getSessionOutcome(sessionId: string): Promise<CheckoutSessionOutcome> {
    try {
      const session = await this.getClient().checkout.sessions.retrieve(sessionId);

      // `no_payment_required` couvre les totaux a zero : la commande est due,
      // meme sans mouvement d'argent.
      if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
        return 'paid';
      }
      // Seule une session expiree est definitivement close. Une session
      // `open`, ou `complete` avec un paiement differe, peut encore aboutir :
      // on s'abstient plutot que de detruire une commande qui sera payee.
      return session.status === 'expired' ? 'unpaid' : 'unknown';
    } catch (error) {
      // Session inconnue de Stripe : plus rien ne peut aboutir, la commande
      // locale est un residu. Toute autre panne est une abstention.
      if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
        return 'unpaid';
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Statut de la session ${sessionId} indisponible: ${message}`);
      return 'unknown';
    }
  }

  /**
   * Commission reellement prelevee par Stripe sur une session payee, en
   * centimes. `null` quand elle n'est pas encore arretee ou que Stripe ne
   * repond pas.
   *
   * Elle est **constatee et non estimee**. Le taux depend du pays d'emission de
   * la carte : une carte de la zone economique europeenne et une carte suisse
   * ne coutent pas le meme prix, du simple au double sur la part variable.
   * Estimer supposerait une hypothese sur la clientele ; la lire n'en demande
   * aucune, pour un appel de plus au moment du paiement.
   *
   * Le montant vit sur la transaction de solde du paiement, d'ou la double
   * expansion : session -> paiement -> encaissement -> transaction de solde.
   */
  async getSessionFeeCents(sessionId: string): Promise<number | null> {
    try {
      const session = await this.getClient().checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent.latest_charge.balance_transaction'],
      });

      const intent = session.payment_intent;
      if (!intent || typeof intent === 'string') {
        return null;
      }
      const charge = intent.latest_charge;
      if (!charge || typeof charge === 'string') {
        return null;
      }
      const balance = charge.balance_transaction;
      if (!balance || typeof balance === 'string') {
        return null;
      }
      return balance.fee;
    } catch (error) {
      // Une commission illisible ne doit jamais empecher une commande payee
      // d'etre enregistree : on renonce au chiffre, pas a la commande.
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Commission Stripe de la session ${sessionId} indisponible: ${message}`);
      return null;
    }
  }

  /**
   * Rembourse intégralement un paiement, identifié par son payment intent.
   *
   * Toujours l'intégralité : aucun montant n'est transmis à Stripe, qui
   * rembourse alors la totalité du paiement encaissé. Cohérent avec
   * l'invariant du reste du module boutique — aucun montant ne vient jamais
   * d'ailleurs que de ce qui a été réellement encaissé.
   *
   * Ne capture aucune erreur : une erreur Stripe (paiement déjà remboursé,
   * identifiant inconnu, compte injoignable) doit remonter telle quelle à
   * l'appelant, qui décide de la traduire en réponse HTTP — rien ici ne doit
   * être écrit en base tant que Stripe n'a pas confirmé.
   */
  async refundPayment(paymentIntentId: string): Promise<{ id: string }> {
    const refund = await this.getClient().refunds.create({ payment_intent: paymentIntentId });
    return { id: refund.id };
  }

  /**
   * Retrouve le remboursement le plus récent d'un paiement.
   *
   * Sert de rattrapage quand `refundPayment` échoue avec le code Stripe
   * `charge_already_refunded` : le paiement a bien été remboursé (par cet
   * appel-ci ou par un précédent dont l'écriture en base a échoué juste
   * après), et c'est ce remboursement existant qu'il faut relier à la
   * commande plutôt que d'en tenter un second. `null` quand Stripe ne
   * connaît aucun remboursement sur ce paiement, cas qui ne devrait pas se
   * produire si `charge_already_refunded` a été renvoyé mais que l'appelant
   * doit pouvoir distinguer d'une trouvaille.
   */
  async findLatestRefund(paymentIntentId: string): Promise<{ id: string } | null> {
    // Stripe liste du plus recent au plus ancien : `limit: 1` donne
    // directement le dernier remboursement, sans tri cote application.
    const refunds = await this.getClient().refunds.list({
      payment_intent: paymentIntentId,
      limit: 1,
    });
    const [latest] = refunds.data;
    return latest ? { id: latest.id } : null;
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      this.logger.error(
        'STRIPE_WEBHOOK_SECRET absente : les webhooks ne peuvent pas être vérifiés',
      );
      throw new InternalServerErrorException('Webhook non configuré');
    }
    return this.getClient().webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
