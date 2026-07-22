import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Order, OrderStatus } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';
import { isPrismaNotFoundError } from '../common/utils/prisma-errors';
import { UpdateOrderDto } from './dto/update-order.dto';
import { formatAddress, formatEuros } from './shop-notifier.service';

export interface PendingBatch {
  count: number;
  orders: Order[];
  recapText: string;
  csv: string;
}

const CSV_HEADER = 'reference,produit,taille,quantite,client,email,adresse,total_eur';

@Injectable()
export class OrdersAdminService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: OrderStatus): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingBatch(): Promise<PendingBatch> {
    const orders = await this.prisma.order.findMany({
      where: { status: 'PAID' },
      orderBy: { createdAt: 'asc' },
    });

    return {
      count: orders.length,
      orders,
      recapText: orders.map((order) => buildRecapLine(order)).join('\n'),
      csv: [CSV_HEADER, ...orders.map((order) => buildCsvLine(order))].join('\n'),
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

  async update(id: number, dto: UpdateOrderDto): Promise<Order> {
    try {
      return await this.prisma.order.update({
        where: { id },
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

function describeSize(order: Order): string {
  return order.size ?? '—';
}

export function buildRecapLine(order: Order): string {
  return [
    order.reference,
    `${order.productName} (${describeSize(order)}) x${order.quantity}`,
    order.customerName,
    formatAddress(order.shippingAddress),
    `${formatEuros(order.totalCents)} €`,
  ].join(' | ');
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildCsvLine(order: Order): string {
  return [
    order.reference,
    order.productName,
    describeSize(order),
    String(order.quantity),
    order.customerName,
    order.customerEmail,
    formatAddress(order.shippingAddress),
    formatEuros(order.totalCents),
  ]
    .map(csvCell)
    .join(',');
}
