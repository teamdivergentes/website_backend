import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User, Role, Prisma } from '../../generated/prisma';
import { CreateUserDto, UpdateUserDto, UpdatePasswordDto, PaginationDto } from './dto/users.dto';
import * as bcrypt from 'bcrypt';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

export type UserWithRole = User & { role: Role };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private excludePassword<T extends { password: string }>(user: T): Omit<T, 'password'> {
    const { password: _password, ...result } = user;
    return result;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        roleId: true,
        role: true,
        actif: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAllPaginated(
    params: PaginationDto,
  ): Promise<PaginatedResponse<Omit<User, 'password'>>> {
    const {
      page = 1,
      limit = 20,
      search,
      roleId,
      actif,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }
    if (roleId !== undefined) {
      where.roleId = roleId;
    }
    if (actif !== undefined) {
      where.actif = actif;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { role: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.excludePassword(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.excludePassword(user);
  }

  async findByEmail(email: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async create(data: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Get default role if not provided
    let roleId = data.roleId;
    if (!roleId) {
      const defaultRole = await this.prisma.role.findFirst({
        where: { name: 'user' },
      });
      if (defaultRole) {
        roleId = defaultRole.id;
      } else {
        throw new BadRequestException('Aucun rôle par défaut trouvé');
      }
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        roleId: roleId,
        actif: data.actif ?? true,
      },
      include: { role: true },
    });

    return this.excludePassword(user);
  }

  async update(id: number, data: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Check email uniqueness if updating
    if (data.email && data.email !== existing.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        throw new ConflictException('Un utilisateur avec cet email existe déjà');
      }
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (data.email) updateData.email = data.email;
    if (data.roleId) {
      updateData.role = {
        connect: { id: data.roleId },
      };
    }
    if (data.actif !== undefined) updateData.actif = data.actif;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });

    return this.excludePassword(user);
  }

  async updatePassword(id: number, dto: UpdatePasswordDto): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async toggleActive(id: number): Promise<Omit<User, 'password'>> {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { actif: !existing.actif },
      include: { role: true },
    });

    return this.excludePassword(user);
  }

  async assignRole(id: number, roleId: number): Promise<Omit<User, 'password'>> {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Rôle non trouvé');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { roleId },
      include: { role: true },
    });

    return this.excludePassword(user);
  }

  async delete(id: number): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.prisma.user.delete({ where: { id } });
  }

  async validateUser(email: string, pwd: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(pwd, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return this.excludePassword(user);
  }
}
