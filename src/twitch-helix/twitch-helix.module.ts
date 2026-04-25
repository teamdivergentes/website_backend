import { Module } from '@nestjs/common';
import { TwitchHelixService } from './twitch-helix.service';

@Module({
  providers: [TwitchHelixService],
  exports: [TwitchHelixService],
})
export class TwitchHelixModule {}
