import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ShopCheckoutService } from './shop-checkout.service';
import { ShopProduct, getActiveProducts } from './shop-catalog';

@Controller()
export class ShopController {
  constructor(private readonly checkoutService: ShopCheckoutService) {}

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
}
