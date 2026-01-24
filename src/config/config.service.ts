import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateConfigDto, CreateConfigDto } from './dto/update-config.dto';

@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.config.findMany({
      orderBy: { key: 'asc' },
    });
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
    try {
      return await this.prisma.config.update({
        where: { key },
        data: {
          value: updateConfigDto.value,
          description: updateConfigDto.description,
        },
      });
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === 'P2025') {
        throw new NotFoundException(`Configuration "${key}" non trouvée`);
      }
      throw error;
    }
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
