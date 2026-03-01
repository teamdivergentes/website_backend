import { IsEmail, IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

export class ApplyRecruitmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'Adresse email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @IsString()
  @IsNotEmpty({ message: 'Le titre du poste est requis' })
  @MaxLength(200)
  postTitle: string;

  @IsString()
  @IsNotEmpty({ message: 'Le type de contrat est requis' })
  @MaxLength(100)
  postType: string;
}
