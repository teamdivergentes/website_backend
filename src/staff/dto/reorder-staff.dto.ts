import { IsArray, ArrayNotEmpty, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class StaffOrderItem {
  @IsInt()
  id: number;

  @IsInt()
  position: number;
}

export class ReorderStaffDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => StaffOrderItem)
  items: StaffOrderItem[];
}
