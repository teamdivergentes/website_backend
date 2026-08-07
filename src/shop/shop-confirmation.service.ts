import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Une ligne telle que la page de remerciement la reaffiche. Ce sont les
 * libelles figes a l'achat, pas le catalogue du jour : le client doit relire
 * exactement ce qu'il vient de payer.
 */
export interface OrderConfirmationItem {
  productName: string;
  size: string;
  flockingText: string | null;
  quantity: number;
}

/**
 * Ce que la page de remerciement a le droit de savoir.
 *
 * Volontairement PAUVRE. L'identifiant de session Stripe est imprevisible mais
 * il voyage dans une URL — barre d'adresse, historique, `Referer`, copier-coller
 * dans une conversation. Il ne peut donc pas garder une adresse postale ni une
 * adresse e-mail en clair. Sont exposes : la reference (que le client doit
 * pouvoir citer au support), le prenom (qui personnalise le message), le detail
 * de ce qui a ete commande, et le total paye.
 */
export interface OrderConfirmation {
  reference: string;
  /** Prenom seul, jamais le nom complet. `null` si Stripe ne l'a pas transmis. */
  firstName: string | null;
  /**
   * Faux tant que le webhook Stripe n'a pas confirme le paiement. Le client
   * arrive presque toujours avant lui : la page doit savoir le dire sans
   * pretendre que rien n'a ete encaisse.
   */
  paid: boolean;
  /** E-mail masque — assez pour verifier ou part le recu, pas pour le lire. */
  maskedEmail: string | null;
  items: OrderConfirmationItem[];
  totalCents: number;
  currency: string;
}

/**
 * Forme d'un identifiant de session Stripe Checkout. Filtrer avant d'interroger
 * la base evite qu'une route publique serve de sonde a requetes arbitraires.
 */
const SESSION_ID_PATTERN = /^cs_\w{10,100}$/;

@Injectable()
export class ShopConfirmationService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySessionId(sessionId: string): Promise<OrderConfirmation> {
    if (!SESSION_ID_PATTERN.test(sessionId)) {
      throw new NotFoundException('Commande introuvable');
    }

    const order = await this.prisma.order.findUnique({
      where: { stripeSessionId: sessionId },
      include: { items: { orderBy: { id: 'asc' } } },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    return {
      reference: order.reference,
      firstName: firstNameOf(order.customerName),
      paid: order.status !== 'PENDING',
      maskedEmail: maskEmail(order.customerEmail),
      items: order.items.map((item) => ({
        productName: item.productName,
        size: item.size,
        flockingText: item.flockingText,
        quantity: item.quantity,
      })),
      totalCents: order.totalCents,
      currency: order.currency,
    };
  }
}

/**
 * Premier mot du nom transmis par Stripe.
 *
 * On ne renvoie jamais le nom complet : « Merci Maxime » suffit a personnaliser,
 * « Merci Maxime Bellet » transforme une URL en fiche d'identite. Le champ est
 * saisi librement par le client, d'ou le garde-fou de longueur — un « prenom »
 * de 200 caracteres n'est pas un prenom, et n'a rien a faire dans un titre.
 */
export function firstNameOf(customerName: string): string | null {
  const first = customerName.trim().split(/\s+/)[0] ?? '';
  return first.length > 0 && first.length <= 40 ? first : null;
}

/**
 * `maxime.bellet@gmail.com` devient `m•••••••••••t@gmail.com`.
 *
 * Le but est que le client reconnaisse SA boite sans que l'adresse soit
 * lisible par qui recupererait l'URL. Le domaine reste en clair : c'est lui qui
 * porte la reconnaissance, et il n'identifie personne a lui seul.
 */
export function maskEmail(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) {
    return null;
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (local.length <= 2) {
    return `${'•'.repeat(local.length)}@${domain}`;
  }
  return `${local[0]}${'•'.repeat(local.length - 2)}${local.at(-1)}@${domain}`;
}
