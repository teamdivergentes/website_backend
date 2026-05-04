import { IsArray, ArrayNotEmpty, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class CoachingStaffOrderItem {
  @IsInt()
  id: number;

  @IsInt()
  position: number;
}

export class ReorderCoachingStaffDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CoachingStaffOrderItem)
  items: CoachingStaffOrderItem[];
}
