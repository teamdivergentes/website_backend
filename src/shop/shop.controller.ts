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
import { ShopCheckoutService } from './shop-checkout.service';
import { ShopWebhookService } from './shop-webhook.service';
import { PublicCatalog, PublicShopProduct, ShopProductsService } from './shop-products.service';

@Controller()
export class ShopController {
  constructor(
    private readonly products: ShopProductsService,
    private readonly checkoutService: ShopCheckoutService,
    private readonly webhookService: ShopWebhookService,
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

  @Post('api/shop/checkout')
  @Public()
  // Limite basse : créer une session de paiement appelle Stripe, c'est coûteux et abusable.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  createCheckout(@Body() dto: CreateCheckoutDto): Promise<{ url: string }> {
    return this.checkoutService.createCheckout(dto);
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
