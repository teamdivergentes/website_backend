import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';
import { StripeService } from './stripe.service';
import { ShopNotifierService, OrderWithItems, StockShortfallLine } from './shop-notifier.service';
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

    const result = await this.markPaid(event.data.object);
    if (!result) {
      return;
    }
    const { order, shortfalls } = result;

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

    // Survente residuelle : deux paiements concurrents ont vide le stock d'une
    // taille geree sous zero entre le devis et le webhook. La commande reste
    // due — le client a paye — mais l'equipe doit le savoir pour gerer le
    // manque a la production.
    if (shortfalls.length > 0) {
      try {
        await this.notifier.notifyStockShortfall(order, shortfalls);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Alerte de rupture de stock pour la commande ${order.reference} en echec: ${message}`,
        );
      }
    }
  }

  /**
   * Passe la commande de PENDING a PAID et decremente le stock de ses lignes,
   * dans la MEME transaction : soit la commande passe payee avec son stock a
   * jour, soit rien ne bouge.
   *
   * Retourne `null` si aucune commande n'a ete basculee — soit le webhook est
   * rejoue (Stripe le fait volontiers), soit la session est inconnue. Dans les
   * deux cas, aucune notification ne doit repartir et aucun stock n'est touche.
   */
  private async markPaid(
    session: Stripe.Checkout.Session,
  ): Promise<{ order: OrderWithItems; shortfalls: StockShortfallLine[] } | null> {
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

    // Prenom et nom saisis dans les champs personnalises de la page de
    // paiement. Absents des sessions creees avant leur introduction, d'ou le
    // repli sur la chaine vide : c'est `customerName` qui reste le nom de
    // reference pour l'expedition.
    const identity = customFieldsIdentity(session);

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
    //
    // Le decompte de stock vit dans la MEME transaction que cette ecriture :
    // soit la commande passe PAID avec son stock a jour, soit ni l'un ni
    // l'autre ne bouge. Un rejeu du webhook (count === 0) ne retouche donc
    // jamais le stock, exactement comme il ne renvoie aucune notification.
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING', stripeSessionId: session.id },
        data: {
          status: 'PAID',
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
          customerEmail: session.customer_details?.email ?? '',
          customerName: session.customer_details?.name ?? '',
          customerFirstName: identity.firstName,
          customerLastName: identity.lastName,
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

      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true },
      });
      const shortfalls = await this.decrementStock(tx, order);

      return { order, shortfalls };
    });
  }

  /**
   * Decremente le stock des lignes d'une commande qui vient de passer PAID.
   *
   * Ne touche qu'aux tailles a stock gere (`stock` non nul) : une taille non
   * geree reste illimitee, comme avant cette colonne.
   *
   * Le decompte est une ecriture ATOMIQUE (`updateMany` conditionne sur
   * `stock >= quantite`), pas un lecture-puis-ecriture : sous READ COMMITTED,
   * deux paiements confirmes a quelques secondes d'intervalle sur la meme
   * taille liraient sinon la meme valeur et ecraseraient chacun le calcul de
   * l'autre — une mise a jour perdue, donc une survente silencieuse et SANS
   * notification, exactement ce que cette fonction doit empecher. L'UPDATE
   * conditionnel de Postgres reevalue sa condition sur la ligne verrouillee
   * au moment de l'ecriture, ce qui ferme cette fenetre.
   *
   * Quand ce decompte atomique ne touche aucune ligne (`count === 0`), trois
   * causes possibles : taille disparue depuis (catalogue modifiable a chaud),
   * taille non geree, ou stock insuffisant. Seule la relecture qui suit
   * permet de les distinguer ; seul le dernier cas est une survente a
   * rapporter, bornee a zero et signalee a l'appelant pour qu'il alerte
   * l'equipe.
   */
  private async decrementStock(
    tx: Prisma.TransactionClient,
    order: OrderWithItems,
  ): Promise<StockShortfallLine[]> {
    const shortfalls: StockShortfallLine[] = [];

    for (const item of order.items) {
      // Le produit a ete supprime depuis l'achat (onDelete: SetNull) : plus
      // rien a decrementer, la ligne ne reference plus de taille geree.
      if (item.productId === null) {
        continue;
      }

      const decremented = await tx.shopProductSize.updateMany({
        where: {
          productId: item.productId,
          label: item.size,
          stock: { not: null, gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (decremented.count > 0) {
        continue;
      }

      const size = await tx.shopProductSize.findUnique({
        where: { productId_label: { productId: item.productId, label: item.size } },
      });
      // Taille disparue depuis, ou non geree : rien a decompter, rien a
      // rapporter.
      if (!size || size.stock === null) {
        continue;
      }

      shortfalls.push({
        productId: item.productId,
        productName: item.productName,
        size: item.size,
        sizeId: size.id,
        requested: item.quantity,
        available: size.stock,
      });

      await tx.shopProductSize.update({
        where: { id: size.id },
        data: { stock: 0 },
      });
    }

    return shortfalls;
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

/**
 * Prenom et nom lus dans les champs personnalises de la session Stripe.
 *
 * Les cles sont celles posees a la creation de la session (`stripe.service.ts`)
 * et Stripe les renvoie telles quelles. Une session anterieure a leur
 * introduction n'a pas de `custom_fields` du tout : la fonction rend alors deux
 * chaines vides, et c'est `customerName` qui continue de porter l'identite.
 *
 * La valeur est nettoyee de ses espaces de bordure, mais pas retaillee : la
 * longueur est deja bornee cote Stripe, et tronquer ici produirait un nom faux
 * sur l'etiquette d'expedition plutot qu'un nom long.
 */
export function customFieldsIdentity(session: Stripe.Checkout.Session): {
  firstName: string;
  lastName: string;
} {
  const read = (key: string): string =>
    session.custom_fields?.find((field) => field.key === key)?.text?.value?.trim() ?? '';

  return { firstName: read('prenom'), lastName: read('nom') };
}
