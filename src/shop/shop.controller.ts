import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { ShopProduct, getActiveProducts } from './shop-catalog';

@Controller()
export class ShopController {
  @Get('api/shop/products')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getProducts(): ShopProduct[] {
    return getActiveProducts();
  }
}
