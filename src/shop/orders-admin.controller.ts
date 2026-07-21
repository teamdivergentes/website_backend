import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Order, OrderStatus } from '../../generated/prisma';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { OrdersAdminService, PendingBatch } from './orders-admin.service';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller()
export class OrdersAdminController {
  constructor(private readonly ordersService: OrdersAdminService) {}

  @Get('api/admin/orders')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COMMANDES_READ)
  findAll(@Query('status') status?: string): Promise<Order[]> {
    return this.ordersService.findAll(status as OrderStatus | undefined);
  }

  @Get('api/admin/orders/pending-batch')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COMMANDES_READ)
  getPendingBatch(): Promise<PendingBatch> {
    return this.ordersService.getPendingBatch();
  }

  @Post('api/admin/orders/mark-sent')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COMMANDES_WRITE)
  markSent(): Promise<{ count: number; batchId: string }> {
    return this.ordersService.markSent();
  }

  @Patch('api/admin/orders/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PERMISSIONS.COMMANDES_WRITE)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto): Promise<Order> {
    return this.ordersService.update(id, dto);
  }
}
