import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from './config.service';
import { UpdateConfigDto, CreateConfigDto } from './dto/update-config.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Endpoint public : retourne uniquement les clés de l'allow-list publique.
   * Les secrets serveur (SMTP, webhooks) sont filtrés.
   */
  @Get()
  @Public()
  @SkipThrottle()
  findAll() {
    return this.configService.findAllPublic();
  }

  /**
   * Endpoint admin : retourne TOUTES les clés, y compris les secrets.
   * Nécessite le rôle admin.
   * IMPORTANT : déclaré AVANT ":key" pour ne pas être capturé par le paramètre de route.
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  findAllAdmin() {
    return this.configService.findAll();
  }

  /**
   * Endpoint public : retourne une clé si elle est dans l'allow-list publique.
   * Retourne 404 si la clé est privée (ne révèle pas son existence).
   */
  @Get(':key')
  @Public()
  @SkipThrottle()
  findOnePublic(@Param('key') key: string) {
    return this.configService.findOnePublic(key);
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
