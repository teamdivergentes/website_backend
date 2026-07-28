import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ShopPricingService, PricedLine } from './shop-pricing.service';
import { OrderReferenceService } from './order-reference.service';
import { StripeService } from './stripe.service';

@Injectable()
export class ShopCheckoutService {
  private readonly logger = new Logger(ShopCheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: ShopPricingService,
    private readonly reference: OrderReferenceService,
    private readonly stripe: StripeService,
  ) {}

  /**
   * Cree la session de paiement.
   *
   * La commande est persistee en `PENDING` **avant** l'appel a Stripe : les
   * metadonnees Stripe sont limitees a 500 caracteres par valeur et ne peuvent
   * pas porter un panier multi-articles avec ses flocages. Seul l'identifiant
   * de commande voyage dans les metadonnees ; le webhook signe reste le seul a
   * pouvoir faire passer la commande en `PAID`.
   */
  async createCheckout(dto: CreateCheckoutDto): Promise<{ url: string }> {
    const cart = await this.pricing.priceCart(dto.items);
    const reference = await this.reference.generate();

    const order = await this.prisma.order.create({
      data: {
        reference,
        // Marqueur temporaire : la colonne est unique et non nulle, l'identifiant
        // Stripe reel n'existe pas encore. Remplace juste apres.
        stripeSessionId: `pending:${reference}`,
        status: 'PENDING',
        subtotalCents: cart.subtotalCents,
        shippingCents: cart.shippingCents,
        totalCents: cart.totalCents,
        currency: cart.currency,
        items: {
          create: cart.lines.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            size: line.size,
            flockingText: line.flockingText,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            flockingFeeCents: line.flockingFeeCents,
            lineTotalCents: line.lineTotalCents,
          })),
        },
      },
    });

    let session: { id: string; url: string };
    try {
      session = await this.stripe.createCheckoutSession({
        lines: cart.lines.map((line) => ({
          label: describeLine(line),
          unitAmountCents: line.unitPriceCents + line.flockingFeeCents,
          quantity: line.quantity,
        })),
        shippingCents: cart.shippingCents,
        currency: cart.currency,
        metadata: { orderId: String(order.id), orderReference: order.reference },
      });
    } catch (error) {
      // Stripe injoignable : la commande PENDING n'a plus de raison d'exister.
      // Son echec de suppression ne doit pas masquer l'erreur d'origine.
      await this.prisma.order
        .delete({ where: { id: order.id } })
        .catch(() => this.logger.warn(`Commande ${order.reference} PENDING orpheline`));
      throw error;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return { url: session.url };
  }
}

/**
 * Libelle de ligne pour Stripe. Le flocage y figure : c'est ce que le client
 * relit avant de payer, et ce qui apparait sur son recu.
 */
export function describeLine(line: Pick<PricedLine, 'productName' | 'size' | 'flockingText'>) {
  const flocking = line.flockingText ? ` — flocage « ${line.flockingText} »` : '';
  return `${line.productName} — taille ${line.size}${flocking}`;
}
