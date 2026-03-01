import { IsEmail, IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ContactDto {
  @IsString()
  @IsNotEmpty({ message: 'Le sujet est requis' })
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'Adresse email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Le message est requis' })
  @MinLength(10, { message: 'Le message doit contenir au moins 10 caractères' })
  @MaxLength(5000)
  message: string;
}
