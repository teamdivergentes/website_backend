import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class ReorderItem {
  @IsInt()
  @Min(1)
  id: number;

  @IsInt()
  @Min(0)
  position: number;
}

export class ReorderGamesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items: ReorderItem[];
}
