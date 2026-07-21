import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopCheckoutService } from './shop-checkout.service';
import { StripeService } from './stripe.service';

@Module({
  controllers: [ShopController],
  providers: [ShopCheckoutService, StripeService],
})
export class ShopModule {}
