import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Rôle non trouvé');
    }

    return role;
  }

  async create(createRoleDto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existing) {
      throw new ConflictException('Un rôle avec ce nom existe déjà');
    }

    return this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        permissions: createRoleDto.permissions,
      },
    });
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Rôle non trouvé');
    }

    // Vérifier si le nouveau nom n'est pas déjà utilisé
    if (updateRoleDto.name && updateRoleDto.name !== existing.name) {
      const nameExists = await this.prisma.role.findUnique({
        where: { name: updateRoleDto.name },
      });
      if (nameExists) {
        throw new ConflictException('Un rôle avec ce nom existe déjà');
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
    });
  }

  async delete(id: number) {
    const existing = await this.prisma.role.findUnique({
      where: { id },
      include: { users: true },
    });

    if (!existing) {
      throw new NotFoundException('Rôle non trouvé');
    }

    // Vérifier si le rôle est utilisé par des utilisateurs
    if (existing.users.length > 0) {
      throw new BadRequestException(
        `Ce rôle est assigné à ${existing.users.length} utilisateur(s). Réassignez-les avant de supprimer ce rôle.`,
      );
    }

    await this.prisma.role.delete({ where: { id } });

    return { message: 'Rôle supprimé avec succès' };
  }
}
