import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopCheckoutService } from './shop-checkout.service';
import { ShopWebhookService } from './shop-webhook.service';
import { ShopNotifierService } from './shop-notifier.service';
import { OrderReferenceService } from './order-reference.service';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ShopController],
  providers: [
    ShopCheckoutService,
    ShopWebhookService,
    ShopNotifierService,
    OrderReferenceService,
    StripeService,
    PrismaService,
  ],
})
export class ShopModule {}
