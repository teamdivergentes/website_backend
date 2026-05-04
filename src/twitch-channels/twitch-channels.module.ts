import { Module } from '@nestjs/common';
import { TwitchChannelsController } from './twitch-channels.controller';
import { TwitchChannelsService } from './twitch-channels.service';
import { PrismaService } from '../prisma.service';
import { TwitchHelixModule } from '../twitch-helix/twitch-helix.module';

@Module({
  imports: [TwitchHelixModule],
  controllers: [TwitchChannelsController],
  providers: [TwitchChannelsService, PrismaService],
  exports: [TwitchChannelsService],
})
export class TwitchChannelsModule {}
