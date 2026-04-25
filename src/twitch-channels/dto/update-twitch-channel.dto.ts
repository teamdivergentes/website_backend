import { PartialType } from '@nestjs/mapped-types';
import { CreateTwitchChannelDto } from './create-twitch-channel.dto';

export class UpdateTwitchChannelDto extends PartialType(CreateTwitchChannelDto) {}
