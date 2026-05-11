import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { TwitchChannelsService } from './twitch-channels.service';
import { CreateTwitchChannelDto } from './dto/create-twitch-channel.dto';
import { UpdateTwitchChannelDto } from './dto/update-twitch-channel.dto';
import { ReorderTwitchChannelsDto } from './dto/reorder-twitch-channels.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class TwitchChannelsController {
  constructor(private readonly twitchChannelsService: TwitchChannelsService) {}

  // ─── Routes publiques ──────────────────────────────────────────────────────

  @Get('api/twitch-channels/live')
  @Public()
  @SkipThrottle()
  findLive() {
    return this.twitchChannelsService.findLive();
  }

  // ─── Routes admin ──────────────────────────────────────────────────────────

  @Get('api/admin/twitch-channels')
  @UseGuards(RolesGuard)
  @Roles('admin', 'gestionnaire')
  findAll() {
    return this.twitchChannelsService.findAll();
  }

  @Get('api/admin/twitch-channels/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'gestionnaire')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.twitchChannelsService.findOne(id);
  }

  @Post('api/admin/twitch-channels')
  @UseGuards(RolesGuard)
  @Roles('admin', 'gestionnaire')
  create(@Body() dto: CreateTwitchChannelDto) {
    return this.twitchChannelsService.create(dto);
  }

  @Patch('api/admin/twitch-channels/reorder')
  @UseGuards(RolesGuard)
  @Roles('admin', 'gestionnaire')
  reorder(@Body() dto: ReorderTwitchChannelsDto) {
    return this.twitchChannelsService.reorder(dto);
  }

  @Patch('api/admin/twitch-channels/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'gestionnaire')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTwitchChannelDto) {
    return this.twitchChannelsService.update(id, dto);
  }

  @Delete('api/admin/twitch-channels/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'gestionnaire')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.twitchChannelsService.delete(id);
  }
}
