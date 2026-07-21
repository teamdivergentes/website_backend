import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
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
import { ShopProduct, getActiveProducts } from './shop-catalog';

@Controller()
export class ShopController {
  constructor(
    private readonly checkoutService: ShopCheckoutService,
    private readonly webhookService: ShopWebhookService,
  ) {}

  @Get('api/shop/products')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getProducts(): ShopProduct[] {
    return getActiveProducts();
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
