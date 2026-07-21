import { Injectable } from '@nestjs/common';
import { Order } from '../../generated/prisma';

@Injectable()
export class ShopNotifierService {
  // Implementation complete en Task 5.
  async notifyNewOrder(_order: Order): Promise<void> {
    return Promise.resolve();
  }
}
