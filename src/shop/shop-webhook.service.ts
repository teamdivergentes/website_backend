import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';
import { StripeService } from './stripe.service';
import { OrderReferenceService } from './order-reference.service';
import { ShopNotifierService } from './shop-notifier.service';

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class ShopWebhookService {
  private readonly logger = new Logger(ShopWebhookService.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly reference: OrderReferenceService,
    private readonly notifier: ShopNotifierService,
  ) {}

  async handleEvent(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.stripe.constructWebhookEvent(payload, signature);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      // Surface d'attaque principale : sans cette verification, n'importe qui
      // pourrait creer des commandes marquees payees.
      this.logger.warn(`Webhook Stripe a signature invalide rejete: ${message}`);
      throw new BadRequestException('Signature invalide');
    }

    if (event.type !== 'checkout.session.completed') {
      return;
    }

    const session = event.data.object;
    const order = await this.createOrder(session);
    if (!order) {
      return;
    }

    // Une notification en echec ne doit jamais annuler une commande deja payee.
    try {
      await this.notifier.notifyNewOrder(order);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Notification de la commande ${order.reference} en echec: ${message}`);
    }
  }

  private async createOrder(session: Stripe.Checkout.Session) {
    const metadata = session.metadata ?? {};
    const quantity = Number(metadata.quantity ?? '1');
    const unitPriceCents = Number(metadata.unitPriceCents ?? '0');
    const shippingCents = session.shipping_cost?.amount_total ?? 0;

    const shipping = (
      session as unknown as {
        collected_information?: { shipping_details?: Record<string, unknown> };
      }
    ).collected_information?.shipping_details;

    try {
      return await this.prisma.order.create({
        data: {
          reference: await this.reference.generate(),
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
          productId: metadata.productId ?? 'inconnu',
          productName: metadata.productName ?? 'Produit inconnu',
          size: metadata.size ? metadata.size : null,
          quantity,
          unitPriceCents,
          shippingCents,
          totalCents: session.amount_total ?? unitPriceCents * quantity + shippingCents,
          currency: session.currency ?? 'eur',
          customerEmail: session.customer_details?.email ?? '',
          customerName: session.customer_details?.name ?? '',
          shippingAddress: shipping ?? {},
          status: 'PAID',
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        // Stripe rejoue ses webhooks : un doublon est un succes, pas une erreur.
        this.logger.log(`Webhook rejoue pour la session ${session.id}, commande deja creee`);
        return null;
      }
      throw error;
    }
  }
}
