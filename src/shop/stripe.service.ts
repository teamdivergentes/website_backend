import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import Stripe from 'stripe';

export interface CheckoutLine {
  /** Libelle affiche sur la page Stripe et sur le recu client. */
  label: string;
  unitAmountCents: number;
  quantity: number;
}

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
      // France uniquement : le tarif de port est unifie et ne couvre pas
      // l'international (cf. spec 2026-07-28).
      shipping_address_collection: { allowed_countries: ['FR'] },
      // Tarif inline plutot qu'un shipping_rate pre-cree dans Stripe : le
      // montant vit en base et doit pouvoir changer depuis l'admin sans
      // resynchroniser un objet Stripe.
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: params.shippingCents, currency: params.currency },
            display_name: 'Livraison France',
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
