import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import Stripe from 'stripe';

export interface CheckoutSessionParams {
  productName: string;
  unitPriceCents: number;
  quantity: number;
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
    const shippingRateId = process.env.STRIPE_SHIPPING_RATE_ID;
    const successUrl = process.env.SHOP_SUCCESS_URL ?? 'http://localhost:4200/boutique/merci';
    const cancelUrl = process.env.SHOP_CANCEL_URL ?? 'http://localhost:4200/boutique';

    const session = await this.getClient().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: params.quantity,
          price_data: {
            currency: 'eur',
            unit_amount: params.unitPriceCents,
            product_data: { name: params.productName },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'CH', 'LU', 'DE', 'ES', 'IT'],
      },
      ...(shippingRateId ? { shipping_options: [{ shipping_rate: shippingRateId }] } : {}),
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
