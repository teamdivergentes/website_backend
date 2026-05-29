import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  // SEC-005 : bcrypt ignore les octets au-delà de 72 — limiter pour prévenir les attaques DoS CPU
  @MaxLength(72, { message: 'Le mot de passe ne peut pas dépasser 72 caractères' })
  password: string;
}
