import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { findActiveProduct } from './shop-catalog';
import { StripeService } from './stripe.service';

@Injectable()
export class ShopCheckoutService {
  constructor(private readonly stripe: StripeService) {}

  async createCheckout(dto: CreateCheckoutDto): Promise<{ url: string }> {
    const product = findActiveProduct(dto.productId);
    if (!product) {
      throw new BadRequestException('Produit introuvable ou indisponible');
    }

    const requiresSize = product.sizes.length > 0;
    if (requiresSize && !dto.size) {
      throw new BadRequestException('La taille est obligatoire pour ce produit');
    }
    if (!requiresSize && dto.size) {
      throw new BadRequestException('Ce produit ne se décline pas en tailles');
    }
    if (dto.size && !product.sizes.includes(dto.size)) {
      throw new BadRequestException('Taille indisponible pour ce produit');
    }

    // Le prix vient du catalogue serveur, jamais de la requête.
    const session = await this.stripe.createCheckoutSession({
      productName: product.name,
      unitPriceCents: product.priceCents,
      quantity: dto.quantity,
      metadata: {
        productId: product.id,
        productName: product.name,
        size: dto.size ?? '',
        quantity: String(dto.quantity),
        unitPriceCents: String(product.priceCents),
      },
    });

    return { url: session.url };
  }
}
