import { IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ReorderImagesDto {
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  orderedIds: number[];
}
