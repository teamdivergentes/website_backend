import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopCheckoutService } from './shop-checkout.service';
import { ShopWebhookService } from './shop-webhook.service';
import { ShopNotifierService } from './shop-notifier.service';
import { OrderReferenceService } from './order-reference.service';
import { StripeService } from './stripe.service';
import { OrdersAdminController } from './orders-admin.controller';
import { OrdersAdminService } from './orders-admin.service';
import { PrismaService } from '../prisma.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [ShopController, OrdersAdminController],
  providers: [
    ShopCheckoutService,
    ShopWebhookService,
    ShopNotifierService,
    OrderReferenceService,
    StripeService,
    OrdersAdminService,
    PrismaService,
  ],
})
export class ShopModule {}
