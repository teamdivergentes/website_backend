import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { SHIPPING_COUNTRIES, SHIPPING_DISPLAY_NAME } from './shop-shipping-zone';

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

export interface CheckoutSessionParams {
  lines: CheckoutLine[];
  shippingCents: number;
  currency: string;
  metadata: Record<string, string>;
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
    const successUrl = process.env.SHOP_SUCCESS_URL ?? 'http://localhost:4200/boutique/merci';
    const cancelUrl = process.env.SHOP_CANCEL_URL ?? 'http://localhost:4200/boutique/panier';

    const session = await this.getClient().checkout.sessions.create({
      mode: 'payment',
      line_items: params.lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: params.currency,
          unit_amount: line.unitAmountCents,
          product_data: { name: line.label },
        },
      })),
      // Zone de livraison europeenne, definie en un seul endroit. Le tarif de
      // port reste unifie sur toute la zone : il est donc vendu a perte sur les
      // destinations lointaines, ce que l'admin voit via `shippingSoldAtLoss`.
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
