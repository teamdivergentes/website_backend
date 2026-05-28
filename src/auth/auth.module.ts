import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy, getJwtSecret } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      // SEC-002 : fail-fast si JWT_SECRET absent — pas de fallback en clair
      secret: getJwtSecret(),
      // Durée configurable via env, par défaut 7j (US admin-auth-persistence)
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ??
          '7d') as `${number}${'s' | 'm' | 'h' | 'd' | 'w'}`,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
