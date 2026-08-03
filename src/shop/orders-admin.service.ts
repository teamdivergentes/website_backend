import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { OrderStatus } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';
import { isPrismaNotFoundError } from '../common/utils/prisma-errors';
import { UpdateOrderDto } from './dto/update-order.dto';
import { formatAddress, formatEuros, OrderWithItems } from './shop-notifier.service';
import { OrderMargin, orderMargin } from './shop-costs';

/** Une commande, augmentee de sa marge. Ne quitte jamais l'administration. */
export interface OrderWithMargin extends OrderWithItems {
  margin: OrderMargin;
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
  constructor(private readonly prisma: PrismaService) {}

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

  async update(id: number, dto: UpdateOrderDto): Promise<OrderWithItems> {
    try {
      return await this.prisma.order.update({
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
