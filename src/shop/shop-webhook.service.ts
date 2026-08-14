import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';
import { StripeService } from './stripe.service';
import { ShopNotifierService, OrderWithItems } from './shop-notifier.service';
import { ShopDiscountService } from './shop-discount.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class ShopWebhookService {
  private readonly logger = new Logger(ShopWebhookService.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly notifier: ShopNotifierService,
    private readonly discounts: ShopDiscountService,
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

    // Le bon de reduction n'est consomme qu'ici : « utiliser un code », c'est
    // payer. Un panier abandonne n'en brule aucun, et le rejeu d'un webhook non
    // plus — `markPaid` n'a rien renvoye dans ce cas.
    //
    // Un echec de comptage ne doit pas faire echouer une commande deja payee :
    // le pire qu'il produit est une utilisation de trop accordee plus tard.
    if (order.discountCodeId) {
      try {
        await this.discounts.consume(order.discountCodeId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Utilisation du code ${order.discountCode ?? '?'} non comptee sur ${order.reference}: ${message}`,
        );
      }
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

    // Commission Stripe constatee, figee au meme titre que les couts
    // fournisseur : elle depend du pays d'emission de la carte, et le tarif du
    // compte peut changer. `null` la laisse a sa valeur par defaut de zero, ce
    // qui surestime la marge de quelques dizaines de centimes plutot que de
    // bloquer l'enregistrement d'une commande payee.
    const stripeFeeCents = await this.stripe.getSessionFeeCents(session.id);

    await this.reconcileAmount(orderId, session);

    // Trois conditions, trois roles distincts :
    //
    //   id              — la commande visee par les metadonnees de la session.
    //   status PENDING  — l'idempotence. Un rejeu ne met a jour aucune ligne et
    //                     ne declenche donc pas de seconde notification.
    //   stripeSessionId — l'authenticite. `metadata.orderId` est une chaine que
    //                     nous avons ecrite, mais la signature du webhook ne
    //                     prouve que l'emetteur, pas que la session payee est
    //                     bien celle que nous avons creee pour cette commande.
    //                     Sans ce troisieme filtre, toute session portant un
    //                     `orderId` de commande en attente la fait basculer en
    //                     payee, pour un montant arbitraire : une session creee
    //                     ailleurs sur le meme compte Stripe suffit. Le filtre
    //                     ferme aussi la violation d'unicite qui survenait quand
    //                     deux sessions differentes visaient la meme commande.
    const { count } = await this.prisma.order.updateMany({
      where: { id: orderId, status: 'PENDING', stripeSessionId: session.id },
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
        stripeFeeCents: stripeFeeCents ?? undefined,
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

  /**
   * Compare ce que Stripe a encaisse a ce que la commande annoncait.
   *
   * La remise est calculee deux fois — a l'affichage du panier, puis au
   * checkout — et transmise a Stripe sous forme de coupon. Un ecart entre les
   * deux montants signale une divergence de calcul ou un coupon qui ne s'est
   * pas applique comme prevu.
   *
   * Ne bloque rien : le client a paye, la commande est due. Le controle
   * transforme une perte silencieuse en ligne de journal exploitable, ce qui
   * est tout ce qu'on peut faire a ce stade.
   */
  private async reconcileAmount(orderId: number, session: Stripe.Checkout.Session): Promise<void> {
    const paidCents = session.amount_total;
    if (paidCents === null || paidCents === undefined) {
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { reference: true, totalCents: true, status: true },
    });

    // Une commande deja traitee est un rejeu : son total porte deja le montant
    // encaisse, le comparer n'apprendrait rien.
    if (order?.status !== 'PENDING' || order.totalCents === paidCents) {
      return;
    }

    this.logger.error(
      `Ecart de montant sur ${order.reference} : ${order.totalCents} centimes attendus, ` +
        `${paidCents} encaisses par Stripe`,
    );
  }
}
