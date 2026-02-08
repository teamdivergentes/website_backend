import { IsArray, ArrayNotEmpty, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItem {
  @IsInt()
  id: number;

  @IsInt()
  position: number;
}

export class ReorderDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItem)
  items: OrderItem[];
}
