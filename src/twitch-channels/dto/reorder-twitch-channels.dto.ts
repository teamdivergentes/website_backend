import { IsArray, ArrayNotEmpty, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class TwitchChannelOrderItem {
  @IsInt()
  id: number;

  @IsInt()
  position: number;
}

export class ReorderTwitchChannelsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TwitchChannelOrderItem)
  items: TwitchChannelOrderItem[];
}
