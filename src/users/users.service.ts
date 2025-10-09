import {Injectable, NotFoundException, UnauthorizedException} from '@nestjs/common';
import {PrismaService} from "../prisma.service";
import {User} from 'generated/prisma/client';
import {UserFormDTO} from "./dto/users.dto";
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async findAllUsers() {
        return this.prisma.user.findMany();
    }

    async createUser(data: UserFormDTO): Promise<User> {
        const {email, role, password} = {...data};
        const hashPassword = await bcrypt.hash(password, 10);
        return this.prisma.user.create({
            data: {email, password: hashPassword, role}
        });
    }

    async findByEmail(email: string): Promise<User|null> {
        return this.prisma.user.findUnique({where: email});
    }

    async validateUser(email: string, password: string): Promise<User|null> {
        const user = await this.findByEmail(email);

        // Si l'utilisateur n'existe pas
        if (!user) {
            throw new NotFoundException('Utilisateur non trouvé');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Mot de passe incorrect');
        }

        return user;
    }

    async deleteUser(email: string): Promise<User> {
        return this.prisma.user.delete({where: email});
    }
}
