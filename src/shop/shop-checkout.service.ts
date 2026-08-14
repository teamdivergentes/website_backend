import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PricingTier } from '../../generated/prisma';
import { ShopPricingService, PricedLine } from './shop-pricing.service';
import { OrderReferenceService } from './order-reference.service';
import { checkoutSessionExpiry, StripeService } from './stripe.service';

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
  async createCheckout(
    dto: CreateCheckoutDto,
    /**
     * Bareme et beneficiaire, decides par l'appelant a partir de l'identite
     * authentifiee. Le controleur public passe `PUBLIC` sans acteur ; la route
     * reservee passe `RETAIL` et l'utilisateur que le garde a valide. Rien de
     * tout cela ne peut venir du corps de la requete.
     *
     * **Obligatoire, sans valeur par defaut**, pour la meme raison que sur
     * `priceCart` : un defaut rend un oubli invisible a la compilation, et son
     * sens decide seul de la gravite de l'oubli.
     */
    tariff: { tier: PricingTier; buyerUserId: number | null },
  ): Promise<{ url: string }> {
    const cart = await this.pricing.priceCart({
      items: dto.items,
      tier: tariff.tier,
      discountCode: dto.discountCode,
    });
    const reference = await this.reference.generate();
    // Calculee avant la creation de la commande, et non au retour de Stripe :
    // c'est elle qui reserve le bon de reduction, et une commande PENDING sans
    // echeance ne reserve rien.
    const sessionExpiresAt = checkoutSessionExpiry();

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
        shippingMethod: cart.shippingMethod,
        // Le montant deduit est fige, pas les conditions du code : celles-ci
        // sont modifiables a chaud et les recalculer plus tard reecrirait
        // l'histoire. Le libelle est duplique volontairement — c'est lui qui
        // rattachera la vente a son operation si le code est renomme ou
        // supprime.
        discountCents: cart.discountCents,
        discountCode: cart.discount?.code ?? null,
        discountCodeId: cart.discount?.id ?? null,
        sessionExpiresAt,
        // Couts figes a l'instant de l'achat : une marge se lit telle qu'elle a
        // ete degagee, pas telle qu'elle serait aux tarifs d'aujourd'hui.
        unitCostCents: cart.unitCostCents,
        shippingCostCents: cart.shippingCostCents,
        orderFeeCents: cart.orderFeeCents,
        pricingTier: cart.tier,
        buyerUserId: tariff.buyerUserId,
        // Fige le prix catalogue du jour : c'est la seule reference qui
        // permettra plus tard de chiffrer l'avantage consenti, le catalogue
        // etant modifiable a chaud.
        publicTotalCents: cart.publicTotalCents,
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
        discountCents: cart.discountCents,
        discountLabel: cart.discount?.code,
        expiresAt: sessionExpiresAt,
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
