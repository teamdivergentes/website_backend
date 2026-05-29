import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsInt } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  // SEC-005 : bcrypt ignore les octets au-delà de 72 — limiter pour prévenir les attaques DoS CPU
  @MaxLength(72, { message: 'Le mot de passe ne peut pas dépasser 72 caractères' })
  password: string;

  @IsOptional()
  @IsInt()
  roleId?: number;
}
