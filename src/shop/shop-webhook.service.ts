import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';
import { StripeService } from './stripe.service';
import { ShopNotifierService, OrderWithItems } from './shop-notifier.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class ShopWebhookService {
  private readonly logger = new Logger(ShopWebhookService.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly notifier: ShopNotifierService,
  ) {}

  async handleEvent(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.stripe.constructWebhookEvent(payload, signature);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      // Surface d'attaque principale : sans cette verification, n'importe qui
      // pourrait marquer des commandes comme payees.
      this.logger.warn(`Webhook Stripe a signature invalide rejete: ${message}`);
      throw new BadRequestException('Signature invalide');
    }

    if (event.type !== 'checkout.session.completed') {
      return;
    }

    const order = await this.markPaid(event.data.object);
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

  /**
   * Passe la commande de PENDING a PAID.
   * Retourne `null` si aucune commande n'a ete basculee — soit le webhook est
   * rejoue (Stripe le fait volontiers), soit la session est inconnue. Dans les
   * deux cas, aucune notification ne doit repartir.
   */
  private async markPaid(session: Stripe.Checkout.Session): Promise<OrderWithItems | null> {
    const orderId = Number(session.metadata?.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      this.logger.warn(`Session ${session.id} sans orderId exploitable dans les metadonnees`);
      return null;
    }

    const shipping = (
      session as unknown as {
        collected_information?: { shipping_details?: Record<string, unknown> };
      }
    ).collected_information?.shipping_details;

    // Le filtre sur status PENDING porte l'idempotence : un rejeu ne met a jour
    // aucune ligne et ne declenche donc pas de seconde notification.
    const { count } = await this.prisma.order.updateMany({
      where: { id: orderId, status: 'PENDING' },
      data: {
        status: 'PAID',
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        customerEmail: session.customer_details?.email ?? '',
        customerName: session.customer_details?.name ?? '',
        shippingAddress: (shipping ?? {}) as Prisma.InputJsonValue,
        shippingCents: session.shipping_cost?.amount_total ?? undefined,
        totalCents: session.amount_total ?? undefined,
      },
    });

    if (count === 0) {
      this.logger.log(`Webhook rejoue pour la session ${session.id}, commande deja traitee`);
      return null;
    }

    return this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
  }
}
