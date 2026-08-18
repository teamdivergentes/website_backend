import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { OrderStatus, Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';
import { isPrismaNotFoundError } from '../common/utils/prisma-errors';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  formatAddress,
  formatEuros,
  OrderWithItems,
  ShopNotifierService,
} from './shop-notifier.service';
import { OrderMargin, orderMargin } from './shop-costs';
import { StripeService } from './stripe.service';

/**
 * Statuts depuis lesquels un remboursement intégral est refusé.
 *
 *   REFUNDED  — déjà remboursée, un second remboursement Stripe échouerait de
 *               toute façon, autant le dire en français plutôt que de
 *               répercuter l'erreur brute de l'API.
 *   CANCELLED — l'annulation porte déjà sa propre communication de
 *               remboursement (cf. ShopNotifierService) ; cette route ne
 *               double pas ce chemin.
 *   PENDING   — session de paiement jamais aboutie : rien n'a été encaissé,
 *               il n'y a rien à rembourser.
 */
const NON_REFUNDABLE_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'REFUNDED',
  'CANCELLED',
  'PENDING',
]);

function nonRefundableReason(status: OrderStatus): string {
  if (status === 'REFUNDED') {
    return 'Cette commande a déjà été remboursée';
  }
  if (status === 'CANCELLED') {
    return 'Cette commande est annulée, elle ne peut pas être remboursée depuis cet écran';
  }
  return "Cette commande n'a jamais été payée, elle ne peut pas être remboursée";
}

/** Une commande, augmentee de sa marge. Ne quitte jamais l'administration. */
export interface OrderWithMargin extends OrderWithItems {
  margin: OrderMargin;
}

/**
 * Fenetre du second compteur, en jours.
 *
 * Glissante, et non calendaire : un compteur « mois en cours » retombe a zero
 * le 1er et donne a lire un arret de l'activite la ou il n'y a qu'un changement
 * de mois.
 */
export const ORDER_COUNTER_WINDOW_DAYS = 30;

/**
 * Compteurs de commandes du dashboard et de la page Statistiques.
 *
 * `PENDING` est exclu des deux chiffres : c'est une session de paiement
 * abandonnee, jamais encaissee. Meme perimetre que `findAll()` sans filtre, de
 * sorte que le compteur et la liste ne se contredisent pas a l'ecran.
 * Les commandes annulees et remboursees comptent : elles ont existe.
 */
export interface OrderCounters {
  total: number;
  lastThirtyDays: number;
  windowDays: number;
}

export interface PendingBatch {
  count: number;
  orders: OrderWithItems[];
  recapText: string;
  csv: string;
}

const CSV_HEADER =
  'reference,produit,taille,flocage,quantite,client,email,adresse,total_commande_eur';

@Injectable()
export class OrdersAdminService {
  private readonly logger = new Logger(OrdersAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: ShopNotifierService,
    private readonly stripe: StripeService,
  ) {}

  /**
   * Ajoute a chaque commande la marge qu'elle a degagee, calculee a partir des
   * couts figes a l'achat et non des tarifs du jour. Reserve a
   * l'administration : ces montants renseignent sur les marges fournisseurs.
   */
  private withMargin(order: OrderWithItems): OrderWithMargin {
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      ...order,
      margin: orderMargin({
        totalCents: order.totalCents,
        unitCostCents: order.unitCostCents,
        shippingCostCents: order.shippingCostCents,
        shippingCents: order.shippingCents,
        totalQuantity,
        orderFeeCents: order.orderFeeCents,
        stripeFeeCents: order.stripeFeeCents,
      }),
    };
  }

  /**
   * Les commandes PENDING sont exclues par defaut : ce sont des sessions de
   * paiement abandonnees, pas des commandes. Elles restent consultables en
   * filtrant explicitement dessus.
   */
  async findAll(status?: OrderStatus): Promise<OrderWithMargin[]> {
    const orders = await this.prisma.order.findMany({
      where: status ? { status } : { status: { not: 'PENDING' } },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.withMargin(order));
  }

  /**
   * `now` est injectable pour que les tests n'aient pas a geler l'horloge.
   */
  async getCounters(now: Date = new Date()): Promise<OrderCounters> {
    const since = new Date(now.getTime() - ORDER_COUNTER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const settled = { status: { not: OrderStatus.PENDING } };

    const [total, lastThirtyDays] = await Promise.all([
      this.prisma.order.count({ where: settled }),
      this.prisma.order.count({ where: { ...settled, createdAt: { gte: since } } }),
    ]);

    return { total, lastThirtyDays, windowDays: ORDER_COUNTER_WINDOW_DAYS };
  }

  async getPendingBatch(): Promise<PendingBatch> {
    const orders = await this.prisma.order.findMany({
      where: { status: 'PAID' },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      count: orders.length,
      orders,
      recapText: orders.map((order) => buildRecapLine(order)).join('\n'),
      csv: [CSV_HEADER, ...orders.flatMap((order) => buildCsvLines(order))].join('\n'),
    };
  }

  /**
   * Bascule toutes les commandes payees non transmises en SENT_TO_MERCHANT,
   * sous un identifiant de lot commun. Volontairement separe de la generation
   * du recapitulatif : l'operateur envoie son mail puis confirme.
   */
  async markSent(): Promise<{ count: number; batchId: string }> {
    const batchId = randomUUID();
    const result = await this.prisma.order.updateMany({
      where: { status: 'PAID' },
      data: {
        status: 'SENT_TO_MERCHANT',
        merchantBatchId: batchId,
        sentToMerchantAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('Aucune commande en attente de transmission');
    }
    return { count: result.count, batchId };
  }

  /**
   * Applique la modification, puis previent le client si l'etape franchie le
   * concerne.
   *
   * Le statut d'avant est relu AVANT l'ecriture : c'est la transition qui
   * declenche le mail, pas l'etat d'arrivee. Rouvrir une commande deja expediee
   * pour completer sa note ne doit pas renvoyer l'avis d'expedition, et c'est
   * l'usage courant du back-office.
   *
   * Le mail part APRES l'ecriture et son echec est avale : un serveur SMTP
   * indisponible ne doit pas empecher un operateur de faire avancer une
   * commande. L'erreur est journalisee en `error` — c'est aujourd'hui la seule
   * trace d'un envoi rate, le schema ne porte aucun journal des notifications.
   */
  async update(id: number, dto: UpdateOrderDto): Promise<OrderWithItems> {
    const previous = await this.prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!previous) {
      throw new NotFoundException(`Commande ${id} introuvable`);
    }

    let order: OrderWithItems;
    try {
      order = await this.prisma.order.update({
        where: { id },
        include: { items: true },
        data: {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.trackingNumber !== undefined && { trackingNumber: dto.trackingNumber }),
          ...(dto.adminNote !== undefined && { adminNote: dto.adminNote }),
        },
      });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException(`Commande ${id} introuvable`);
      }
      throw error;
    }

    try {
      const sent = await this.notifier.notifyStatusChange(order, previous.status);
      if (sent) {
        this.logger.log(
          `Commande ${order.reference} : client prévenu du passage en ${order.status}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Commande ${order.reference} passée en ${order.status} mais le mail au client a échoué: ${message}`,
      );
    }

    return order;
  }

  /**
   * Remboursement intégral d'une commande, déclenché depuis l'admin.
   *
   * L'appel à Stripe précède toute écriture : un échec Stripe ne modifie rien
   * en base, l'erreur remonte telle quelle. Une fois le remboursement
   * confirmé, la mise à jour de la commande, le recrédit du stock des tailles
   * gérées et la pose de `stripeRefundId` / `refundedAt` se font dans la MÊME
   * transaction — soit tout est à jour, soit rien ne bouge en base.
   *
   * **Idempotence sur `charge_already_refunded`.** Si Stripe rembourse avec
   * succès mais que l'écriture en base échoue juste après (crash, coupure
   * réseau), la commande reste PAID alors que l'argent est déjà parti : sans
   * rattrapage, toute relance échouerait indéfiniment avec cette même erreur
   * Stripe, la base restant fausse pour toujours. Ce code précis n'est donc
   * pas traité comme un échec : le remboursement déjà existant est retrouvé
   * via `stripe.refunds.list` et l'écriture en base reprend comme si
   * `refundPayment` avait réussi. Ça rend aussi inoffensif un double-clic
   * admin concurrent, qui produirait la même erreur Stripe sur le second
   * appel.
   *
   * Le mail client (EPIC-47) part APRES l'écriture, par le même chemin que
   * tout changement de statut : `notifyStatusChange` sait déjà construire le
   * message REFUNDED. Son échec est journalisé et n'annule jamais un
   * remboursement déjà acté.
   */
  async refund(id: number): Promise<OrderWithItems> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException(`Commande ${id} introuvable`);
    }

    if (NON_REFUNDABLE_STATUSES.has(order.status)) {
      throw new ConflictException(nonRefundableReason(order.status));
    }

    if (!order.stripePaymentIntentId) {
      throw new BadRequestException(
        `Commande ${order.reference} : aucun paiement Stripe associé, remboursement impossible`,
      );
    }

    const refund = await this.refundViaStripe(order, order.stripePaymentIntentId);

    const refundedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.recreditStock(tx, order);
      return tx.order.update({
        where: { id },
        include: { items: true },
        data: { status: 'REFUNDED', stripeRefundId: refund.id, refundedAt },
      });
    });

    try {
      const sent = await this.notifier.notifyStatusChange(updated, order.status);
      if (sent) {
        this.logger.log(`Commande ${updated.reference} : client prévenu du remboursement`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Commande ${updated.reference} remboursée mais le mail au client a échoué: ${message}`,
      );
    }

    return updated;
  }

  /**
   * Appelle Stripe et rend le remboursement, en rattrapant le seul cas d'échec
   * qui n'en est pas un.
   *
   * `charge_already_refunded` signifie que le remboursement a bien eu lieu chez
   * Stripe et que c'est notre base qui est en retard — typiquement un premier
   * appel dont la réponse s'est perdue, ou deux admins simultanés. Le reprendre
   * plutôt que de le rejeter évite une commande encaissée, remboursée chez
   * Stripe, et affichée comme non remboursée chez nous.
   *
   * Extrait de `refund` pour la lisibilité : la méthode appelante enchaînait
   * les gardes d'entrée, ce rattrapage et l'écriture transactionnelle, ce qui
   * la rendait difficile à suivre d'un bout à l'autre.
   */
  private async refundViaStripe(
    order: OrderWithItems,
    paymentIntentId: string,
  ): Promise<{ id: string }> {
    try {
      return await this.stripe.refundPayment(paymentIntentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Remboursement Stripe échoué pour la commande ${order.reference}: ${message}`,
      );

      if (!(error instanceof Stripe.errors.StripeError)) {
        throw new BadGatewayException('Erreur de communication avec Stripe lors du remboursement');
      }

      if (error.code !== 'charge_already_refunded') {
        // Une erreur Stripe typée (identifiant inconnu, etat de paiement
        // incompatible...) est une reponse claire de l'API sur l'etat du
        // paiement : elle merite un 400, pas un 502 qui laisserait croire a
        // une panne reseau.
        throw new BadRequestException(`Remboursement refusé par Stripe : ${message}`);
      }

      const existing = await this.stripe.findLatestRefund(paymentIntentId);
      if (!existing) {
        throw new BadGatewayException(
          'Stripe indique un remboursement déjà effectué, mais aucun remboursement associé n’a été retrouvé',
        );
      }

      this.logger.warn(
        `Commande ${order.reference} : remboursement Stripe déjà effectué (${existing.id}), reprise de la mise à jour en base`,
      );
      return existing;
    }
  }

  /**
   * Re-crédite le stock des tailles gérées d'une commande remboursée.
   *
   * Symétrique du décompte fait au webhook (`ShopWebhookService`) : ne touche
   * qu'aux tailles à stock géré (`stock: { not: null }`), et ignore les
   * lignes dont le produit a disparu depuis. Écriture ATOMIQUE
   * (`increment`), pas un lecture-puis-écriture : un incrément est
   * intrinsèquement sûr sous les accès concurrents, il n'a pas besoin de
   * condition — à la différence du décompte, qui doit vérifier un plancher.
   * Aucun plafond haut n'est nécessaire non plus : la quantité rendue est
   * exactement celle qui avait été décomptée à l'achat, jamais plus.
   */
  private async recreditStock(tx: Prisma.TransactionClient, order: OrderWithItems): Promise<void> {
    for (const item of order.items) {
      if (item.productId === null) {
        continue;
      }

      await tx.shopProductSize.updateMany({
        where: { productId: item.productId, label: item.size, stock: { not: null } },
        data: { stock: { increment: item.quantity } },
      });
    }
  }
}

// Pure helper functions (no DI)

function describeFlocking(flockingText: string | null): string {
  return flockingText ?? 'sans flocage';
}

export function buildRecapLine(order: OrderWithItems): string {
  const items = order.items
    .map(
      (item) =>
        `${item.productName} (${item.size}, ${describeFlocking(item.flockingText)}) x${item.quantity}`,
    )
    .join(' + ');

  return [
    order.reference,
    items,
    order.customerName,
    formatAddress(order.shippingAddress),
    `${formatEuros(order.totalCents)} €`,
  ].join(' | ');
}

/**
 * Neutralise l'injection de formule.
 *
 * Un tableur interprete une cellule commencant par `=`, `+`, `-`, `@`, une
 * tabulation ou un retour chariot comme une formule, y compris apres avoir
 * retire les guillemets. Le flocage est une saisie client : meme si son charset
 * exclut deja `=`, `+` et `@`, il autorise le tiret, et ce fichier est ouvert
 * dans Excel par un humain.
 */
function csvCell(value: string): string {
  const dangerous = /^[=+\-@\t\r]/.test(value);
  const safe = dangerous ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

/** Une ligne par article : c'est ce que le fabricant doit produire. */
export function buildCsvLines(order: OrderWithItems): string[] {
  // Le montant est laisse vide sur une commande a prix coutant.
  //
  // Ce fichier part chez le fabricant. Le total d'une commande au tarif reserve
  // est, a peu de chose pres, ce que nous lui payons : le lui transmettre
  // reviendrait a lui donner notre structure de marge sur ses propres produits.
  //
  // La commande reste dans le lot : elle doit etre produite comme une autre.
  // Seul le prix disparait — le fabricant a besoin du produit, de la taille, du
  // flocage et de l'adresse, pas de ce que l'acheteur a paye.
  const amount = order.pricingTier === 'RETAIL' ? '' : formatEuros(order.totalCents);

  return order.items.map((item) =>
    [
      order.reference,
      item.productName,
      item.size,
      describeFlocking(item.flockingText),
      String(item.quantity),
      order.customerName,
      order.customerEmail,
      formatAddress(order.shippingAddress),
      amount,
    ]
      .map(csvCell)
      .join(','),
  );
}
