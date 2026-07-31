import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShopSettings } from '../../generated/prisma';
import { UpdateShopSettingsDto } from './dto/update-shop-settings.dto';

/** Identifiant du singleton de reglages. */
const SETTINGS_ID = 1;

@Injectable()
export class ShopSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retourne les reglages, en les creant au besoin.
   * La migration insere deja la ligne ; l'upsert couvre les bases restaurees
   * depuis un dump anterieur, pour qu'aucun appelant n'ait a gerer le cas nul.
   */
  async get(): Promise<ShopSettings> {
    return this.prisma.shopSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    });
  }

  async update(dto: UpdateShopSettingsDto): Promise<ShopSettings> {
    return this.prisma.shopSettings.upsert({
      where: { id: SETTINGS_ID },
      update: dto,
      create: { id: SETTINGS_ID, ...dto },
    });
  }
}
