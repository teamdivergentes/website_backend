import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateConfigDto, CreateConfigDto } from './dto/update-config.dto';
import { isPublicConfigKey } from './public-config-keys';

@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.config.findMany({
      orderBy: { key: 'asc' },
      take: 200,
    });
  }

  /**
   * Retourne uniquement les configurations dont la clé est dans l'allow-list publique.
   * Utilisé par l'endpoint public GET /api/config.
   * Principe fail-safe : tout ce qui n'est pas explicitement public est privé.
   */
  async findAllPublic() {
    const all = await this.prisma.config.findMany({
      orderBy: { key: 'asc' },
      take: 200,
    });
    return all.filter((config) => isPublicConfigKey(config.key));
  }

  /**
   * Retourne une configuration publique par clé.
   * Si la clé n'est pas dans l'allow-list, retourne 404 (ne révèle pas l'existence d'une clé privée).
   * Utilisé par l'endpoint public GET /api/config/:key.
   */
  async findOnePublic(key: string) {
    if (!isPublicConfigKey(key)) {
      throw new NotFoundException(`Configuration "${key}" non trouvée`);
    }

    const config = await this.prisma.config.findUnique({
      where: { key },
    });

    if (!config) {
      throw new NotFoundException(`Configuration "${key}" non trouvée`);
    }

    return config;
  }

  async findOne(key: string) {
    const config = await this.prisma.config.findUnique({
      where: { key },
    });

    if (!config) {
      throw new NotFoundException(`Configuration "${key}" non trouvée`);
    }

    return config;
  }

  /**
   * Récupère la valeur d'une config ou null si elle n'existe pas
   * Utile pour les configs optionnelles
   */
  async getValue(key: string): Promise<string | null> {
    const config = await this.prisma.config.findUnique({
      where: { key },
    });
    return config?.value ?? null;
  }

  async create(createConfigDto: CreateConfigDto) {
    try {
      return await this.prisma.config.create({
        data: {
          key: createConfigDto.key,
          value: createConfigDto.value,
          description: createConfigDto.description,
        },
      });
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === 'P2002') {
        throw new ConflictException(`La clé "${createConfigDto.key}" existe déjà`);
      }
      throw error;
    }
  }

  async update(key: string, updateConfigDto: UpdateConfigDto) {
    // Upsert: crée la config si elle n'existe pas, sinon la met à jour
    return await this.prisma.config.upsert({
      where: { key },
      update: {
        value: updateConfigDto.value,
        description: updateConfigDto.description,
      },
      create: {
        key,
        value: updateConfigDto.value,
        description: updateConfigDto.description,
      },
    });
  }

  async delete(key: string) {
    try {
      await this.prisma.config.delete({
        where: { key },
      });
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === 'P2025') {
        throw new NotFoundException(`Configuration "${key}" non trouvée`);
      }
      throw error;
    }
  }
}
