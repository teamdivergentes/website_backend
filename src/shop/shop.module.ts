import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ShopController } from './shop.controller';
import { ShopRetailController } from './shop-retail.controller';
import { ShopAdminController } from './shop-admin.controller';
import { ShopCheckoutService } from './shop-checkout.service';
import { ShopWebhookService } from './shop-webhook.service';
import { ShopConfirmationService } from './shop-confirmation.service';
import { ShopNotifierService } from './shop-notifier.service';
import { ShopProductsService } from './shop-products.service';
import { ShopSettingsService } from './shop-settings.service';
import { ShopPricingService } from './shop-pricing.service';
import { ShopRetentionService } from './shop-retention.service';
import { OrderReferenceService } from './order-reference.service';
import { StripeService } from './stripe.service';
import { OrdersAdminController } from './orders-admin.controller';
import { OrdersAdminService } from './orders-admin.service';
import { PrismaService } from '../prisma.service';
import { ConfigModule } from '../config/config.module';

@Module({
  // ScheduleModule.forRoot() est marque @Global cote @nestjs/schedule : il
  // suffit de l'importer une seule fois n'importe ou dans l'app pour que le
  // SchedulerRegistry soit disponible partout. On l'importe ici plutot que
  // dans AppModule pour garder la purge RGPD entierement encapsulee dans le
  // module boutique, seul concerne par cette obligation.
  imports: [ConfigModule, ScheduleModule.forRoot()],
  controllers: [ShopController, ShopRetailController, ShopAdminController, OrdersAdminController],
  providers: [
    ShopProductsService,
    ShopSettingsService,
    ShopPricingService,
    ShopCheckoutService,
    ShopWebhookService,
    ShopConfirmationService,
    ShopNotifierService,
    ShopRetentionService,
    OrderReferenceService,
    StripeService,
    OrdersAdminService,
    PrismaService,
  ],
})
export class ShopModule {}
