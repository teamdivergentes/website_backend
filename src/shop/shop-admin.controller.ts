import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ShopSettings } from '../../generated/prisma';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { ShopProductsService } from './shop-products.service';
import { ShopSettingsService } from './shop-settings.service';
import { CreateShopProductDto, UpdateShopProductDto } from './dto/shop-product.dto';
import { UpdateShopSettingsDto } from './dto/update-shop-settings.dto';
import { CreateDiscountCodeDto, UpdateDiscountCodeDto } from './dto/discount-code.dto';
import { AdminDiscountCode, ShopDiscountService } from './shop-discount.service';

@Controller()
export class ShopAdminController {
  constructor(
    private readonly products: ShopProductsService,
    private readonly settings: ShopSettingsService,
    private readonly discounts: ShopDiscountService,
  ) {}

  @Get('api/admin/shop/products')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_READ)
  findAll() {
    return this.products.findAllForAdmin();
  }

  @Get('api/admin/shop/products/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_READ)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.products.findOneForAdmin(id);
  }

  @Post('api/admin/shop/products')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_WRITE)
  create(@Body() dto: CreateShopProductDto) {
    return this.products.create(dto);
  }

  @Patch('api/admin/shop/products/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_WRITE)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShopProductDto) {
    return this.products.update(id, dto);
  }

  @Delete('api/admin/shop/products/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_WRITE)
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.products.remove(id);
  }

  // --- Bons de reduction --------------------------------------------------
  //
  // Sous la meme permission que le catalogue et les reglages : les codes
  // vivent dans le meme ecran, et separer les droits ajouterait une entree a
  // administrer sans separer les usages.

  @Get('api/admin/shop/discount-codes')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_READ)
  findDiscountCodes(): Promise<AdminDiscountCode[]> {
    return this.discounts.findAllForAdmin();
  }

  /**
   * Propose un code libre. En ecriture bien qu'il ne modifie rien : c'est une
   * etape de la creation d'un code, pas une consultation.
   */
  @Get('api/admin/shop/discount-codes/suggestion')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_WRITE)
  suggestDiscountCode(): Promise<{ code: string }> {
    return this.discounts.suggestCode();
  }

  @Post('api/admin/shop/discount-codes')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_WRITE)
  createDiscountCode(@Body() dto: CreateDiscountCodeDto) {
    return this.discounts.createForAdmin(dto);
  }

  @Patch('api/admin/shop/discount-codes/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_WRITE)
  updateDiscountCode(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDiscountCodeDto) {
    return this.discounts.updateForAdmin(id, dto);
  }

  @Delete('api/admin/shop/discount-codes/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_WRITE)
  @HttpCode(204)
  removeDiscountCode(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.discounts.removeForAdmin(id);
  }

  @Get('api/admin/shop/settings')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_READ)
  getSettings(): Promise<ShopSettings> {
    return this.settings.get();
  }

  @Patch('api/admin/shop/settings')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.BOUTIQUE_WRITE)
  updateSettings(@Body() dto: UpdateShopSettingsDto): Promise<ShopSettings> {
    return this.settings.update(dto);
  }
}
