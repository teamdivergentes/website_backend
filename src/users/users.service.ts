import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User, Role } from '../../generated/prisma';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import * as bcrypt from 'bcrypt';

export type UserWithRole = User & { role: Role };

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const { password: _password, ...result } = user;
    return result;
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

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        roleId: data.roleId,
      },
      include: { role: true },
    });

    const { password: _password, ...result } = user;
    return result;
  }

  async update(id: number, data: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const updateData: { email?: string; password?: string; roleId?: number; actif?: boolean } = {};

    if (data.email) updateData.email = data.email;
    if (data.roleId) updateData.roleId = data.roleId;
    if (data.actif !== undefined) updateData.actif = data.actif;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });

    const { password: _password, ...result } = user;
    return result;
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

    const { password: _password, ...result } = user;
    return result;
  }
}
