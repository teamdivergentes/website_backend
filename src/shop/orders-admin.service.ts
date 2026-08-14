import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { OrderStatus } from '../../generated/prisma';
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
