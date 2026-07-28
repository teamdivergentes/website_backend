import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShopSettingsService } from './shop-settings.service';
import { assertFlockingAllowed, normalizeFlocking } from './shop-flocking';
import { CheckoutItemDto } from './dto/create-checkout.dto';

/** Nombre total d'articles accepte dans un panier, toutes lignes confondues. */
export const MAX_CART_ITEMS = 20;

export interface PricedLine {
  productId: number;
  productName: string;
  size: string;
  flockingText: string | null;
  quantity: number;
  /** Prix catalogue unitaire, hors flocage. */
  unitPriceCents: number;
  /** Surcout unitaire de flocage, 0 si pas de flocage. */
  flockingFeeCents: number;
  lineTotalCents: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
}

@Injectable()
export class ShopPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: ShopSettingsService,
  ) {}

  /**
   * Transforme un panier client en panier tarife.
   *
   * Invariant central de la boutique : **aucun montant n'est lu depuis la
   * requete**. Le client ne transmet que des identifiants, des tailles, des
   * quantites et un texte de flocage ; tous les prix sont resolus depuis la
   * base. Sans cela, un panier forge permet d'acheter un maillot a 0,01 €.
   */
  async priceCart(items: CheckoutItemDto[]): Promise<PricedCart> {
    const settings = await this.settings.get();
    if (!settings.shopEnabled) {
      throw new ForbiddenException('La boutique est actuellement fermée');
    }

    if (items.length === 0) {
      throw new BadRequestException('Le panier est vide');
    }

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity > MAX_CART_ITEMS) {
      throw new BadRequestException(`Un panier ne peut pas dépasser ${MAX_CART_ITEMS} articles`);
    }

    const products = await this.prisma.shopProduct.findMany({
      where: { id: { in: items.map((item) => item.productId) }, active: true },
      include: { sizes: true },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    const lines = items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new BadRequestException('Produit introuvable ou indisponible');
      }

      if (!product.sizes.some((size) => size.label === item.size)) {
        throw new BadRequestException(`Taille indisponible pour « ${product.name} »`);
      }

      const flockingText = normalizeFlocking(item.flockingText);
      assertFlockingAllowed(flockingText, product);

      // Le surcout n'est facture que si un flocage est effectivement demande :
      // « il est egalement possible de ne rien mettre ».
      const flockingFeeCents = flockingText ? product.flockingFeeCents : 0;
      const unitTotalCents = product.priceCents + flockingFeeCents;

      return {
        productId: product.id,
        productName: product.name,
        size: item.size,
        flockingText,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        flockingFeeCents,
        lineTotalCents: unitTotalCents * item.quantity,
      };
    });

    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    // Tarif unifie : compte une seule fois, quel que soit le nombre d'articles.
    const shippingCents = settings.shippingFeeCents;

    return {
      lines,
      subtotalCents,
      shippingCents,
      totalCents: subtotalCents + shippingCents,
      currency: settings.currency,
    };
  }
}
