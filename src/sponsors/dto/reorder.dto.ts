import { IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ReorderSponsorsDto {
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  orderedIds: number[];
}
