import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ContactDto {
  @IsString()
  @IsNotEmpty({ message: 'Le sujet est requis' })
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  name: string;

  @IsEmail({}, { message: 'Adresse email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Le message est requis' })
  @MinLength(10, { message: 'Le message doit contenir au moins 10 caractères' })
  message: string;
}
