import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { UpdateConfigDto, CreateConfigDto } from './dto/update-config.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @Public()
  findAll() {
    return this.configService.findAll();
  }

  @Get(':key')
  @Public()
  findOne(@Param('key') key: string) {
    return this.configService.findOne(key);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() createConfigDto: CreateConfigDto) {
    return this.configService.create(createConfigDto);
  }

  @Put(':key')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('key') key: string, @Body() updateConfigDto: UpdateConfigDto) {
    return this.configService.update(key, updateConfigDto);
  }

  @Delete(':key')
  @UseGuards(RolesGuard)
  @Roles('admin')
  delete(@Param('key') key: string) {
    return this.configService.delete(key);
  }
}
