import { IsEmail, IsString, MinLength, Matches, IsOptional, IsInt } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre',
  })
  password: string;

  @IsOptional()
  @IsInt()
  roleId?: number;
}
