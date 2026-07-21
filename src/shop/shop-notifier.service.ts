import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Order } from '../../generated/prisma';
import { ConfigService } from '../config/config.service';

@Injectable()
export class ShopNotifierService {
  private readonly logger = new Logger(ShopNotifierService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Notifie l'equipe d'une nouvelle commande payee, par mail et sur Discord.
   * Chaque canal a son propre try/catch : un canal en echec n'empeche pas l'autre.
   * La methode ne rejette que si les deux canaux echouent.
   */
  async notifyNewOrder(order: Order): Promise<void> {
    const results = { email: false, discord: false };

    try {
      await this.sendEmail(order);
      results.email = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Mail de commande ${order.reference} en echec: ${message}`);
    }

    try {
      await this.sendDiscord(order);
      results.discord = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Webhook Discord pour ${order.reference} en echec: ${message}`);
    }

    if (!results.email && !results.discord) {
      throw new Error(`Aucune notification envoyee pour la commande ${order.reference}`);
    }
    if (!results.email || !results.discord) {
      const failed = !results.email ? 'email' : 'Discord';
      this.logger.warn(
        `Commande ${order.reference} enregistree mais notification ${failed} en echec`,
      );
    }
  }

  private async sendEmail(order: Order): Promise<void> {
    const [host, port, user, pass, recipient] = await Promise.all([
      this.config.getValue('contact_smtp_host'),
      this.config.getValue('contact_smtp_port'),
      this.config.getValue('contact_smtp_user'),
      this.config.getValue('contact_smtp_pass'),
      this.config.getValue('shop_team_email'),
    ]);

    if (!host || !user || !pass) {
      throw new Error('SMTP configuration missing in database');
    }
    const to = recipient || user;

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port || '587', 10),
      secure: port === '465',
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: user,
      to,
      subject: `Nouvelle commande boutique ${order.reference}`,
      text: buildOrderEmailText(order),
      html: buildOrderEmailHtml(order),
    });
  }

  private async sendDiscord(order: Order): Promise<void> {
    const webhookUrl = await this.config.getValue('shop_discord_webhook');
    if (!webhookUrl) {
      throw new Error('Discord webhook not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [buildOrderDiscordEmbed(order)] }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Discord webhook responded ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}

// Pure helper functions (no DI)

export function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface StripeAddress {
  line1?: string;
  line2?: string;
  postal_code?: string;
  city?: string;
  country?: string;
}

export function formatAddress(shippingAddress: unknown): string {
  const address = (shippingAddress as { address?: StripeAddress } | null)?.address;
  if (!address?.line1) {
    return 'Adresse non renseignée';
  }
  const locality = [address.postal_code, address.city].filter(Boolean).join(' ');
  return [address.line1, address.line2, locality, address.country].filter(Boolean).join(', ');
}

function describeItem(order: Order): string {
  const size = order.size ? ` — taille ${order.size}` : '';
  return `${order.productName}${size} × ${order.quantity}`;
}

export function buildOrderEmailText(order: Order): string {
  return [
    `Nouvelle commande ${order.reference}`,
    '',
    `Produit  : ${describeItem(order)}`,
    `Client   : ${order.customerName} <${order.customerEmail}>`,
    `Adresse  : ${formatAddress(order.shippingAddress)}`,
    `Port     : ${formatEuros(order.shippingCents)} €`,
    `Total    : ${formatEuros(order.totalCents)} €`,
  ].join('\n');
}

export function buildOrderEmailHtml(order: Order): string {
  const row = (label: string, value: string): string =>
    `<tr><td style="padding:4px 12px 4px 0;"><strong>${label}</strong></td><td>${escapeHtml(value)}</td></tr>`;

  return `<h2>Nouvelle commande ${escapeHtml(order.reference)}</h2>
<table>
${row('Produit', describeItem(order))}
${row('Client', `${order.customerName} <${order.customerEmail}>`)}
${row('Adresse', formatAddress(order.shippingAddress))}
${row('Port', `${formatEuros(order.shippingCents)} €`)}
${row('Total', `${formatEuros(order.totalCents)} €`)}
</table>`;
}

export interface DiscordEmbed {
  title: string;
  color: number;
  fields: { name: string; value: string; inline?: boolean }[];
}

export function buildOrderDiscordEmbed(order: Order): DiscordEmbed {
  return {
    title: `🛒 Nouvelle commande ${order.reference}`,
    color: 0x32d299,
    fields: [
      { name: 'Produit', value: describeItem(order) },
      { name: 'Client', value: `${order.customerName} (${order.customerEmail})` },
      { name: 'Total', value: `${formatEuros(order.totalCents)} €`, inline: true },
      { name: 'Adresse de livraison', value: formatAddress(order.shippingAddress) },
    ],
  };
}
