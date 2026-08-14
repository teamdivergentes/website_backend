import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CartQuote, toCartQuote } from './dto/cart-quote.dto';
import { ShopCheckoutService } from './shop-checkout.service';
import { ShopPricingService } from './shop-pricing.service';
import { ShopWebhookService } from './shop-webhook.service';
import { OrderConfirmation, ShopConfirmationService } from './shop-confirmation.service';
import { PublicCatalog, PublicShopProduct, ShopProductsService } from './shop-products.service';

@Controller()
export class ShopController {
  constructor(
    private readonly products: ShopProductsService,
    private readonly pricing: ShopPricingService,
    private readonly checkoutService: ShopCheckoutService,
    private readonly webhookService: ShopWebhookService,
    private readonly confirmation: ShopConfirmationService,
  ) {}

  @Get('api/shop/products')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getCatalog(): Promise<PublicCatalog> {
    return this.products.findPublicCatalog();
  }

  @Get('api/shop/products/:slug')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  getProduct(@Param('slug') slug: string): Promise<PublicShopProduct> {
    return this.products.findPublicBySlug(slug);
  }

  /**
   * Recalcule le panier, bon de reduction compris, sans rien engager.
   *
   * Le panier client ne stocke aucun montant : les prix sont resolus ici a
   * chaque affichage, ce qui evite de facturer un tarif perime et rend un
   * `localStorage` modifie sans effet. Le code de reduction suit le meme
   * chemin — le front transmet la chaine saisie et affiche la reponse, il
   * n'evalue jamais la validite d'un code lui-meme.
   *
   * La limite est basse pour la meme raison que sur le checkout : cet endpoint
   * dit si un code existe, il ne doit pas servir a les balayer.
   */
  @Post('api/shop/cart/quote')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  quoteCart(@Body() dto: CreateCheckoutDto): Promise<CartQuote> {
    return this.pricing
      .priceCart({ items: dto.items, tier: 'PUBLIC', discountCode: dto.discountCode })
      .then(toCartQuote);
  }

  @Post('api/shop/checkout')
  @Public()
  // Limite basse : créer une session de paiement appelle Stripe, c'est coûteux et abusable.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  createCheckout(@Body() dto: CreateCheckoutDto): Promise<{ url: string }> {
    // Bareme public, explicitement : ce tunnel est anonyme, il n'a pas
    // d'acheteur identifie et n'accorde aucun tarif reserve. L'ecrire plutot
    // que de le laisser deduire d'un defaut est ce qui garantit qu'ajouter un
    // troisieme tunnel demain obligera son auteur a se poser la question.
    return this.checkoutService.createCheckout(dto, { tier: 'PUBLIC', buyerUserId: null });
  }

  /**
   * Recapitulatif affiche sur la page de remerciement, apres le retour de
   * Stripe.
   *
   * Publique, et elle doit l'etre : l'acheteur du tunnel public n'a pas de
   * compte, il n'y a donc aucune identite a verifier. L'autorisation tient a
   * l'identifiant de session, imprevisible et connu du seul navigateur qui
   * vient de payer. C'est le motif recommande par Stripe pour cet ecran, et il
   * n'est acceptable que parce que la reponse ne porte rien de sensible — voir
   * `OrderConfirmation`. La limite basse ferme le balayage d'identifiants.
   */
  @Get('api/shop/orders/:sessionId')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  getOrderConfirmation(@Param('sessionId') sessionId: string): Promise<OrderConfirmation> {
    return this.confirmation.findBySessionId(sessionId);
  }

  @Post('api/shop/webhook')
  @Public()
  @HttpCode(200)
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: boolean }> {
    if (!signature || !request.rawBody) {
      throw new BadRequestException('Signature manquante');
    }
    await this.webhookService.handleEvent(request.rawBody, signature);
    return { received: true };
  }
}
