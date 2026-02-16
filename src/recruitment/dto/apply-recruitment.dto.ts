import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class ApplyRecruitmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  name: string;

  @IsEmail({}, { message: 'Adresse email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsString()
  @IsNotEmpty({ message: 'Le titre du poste est requis' })
  postTitle: string;

  @IsString()
  @IsNotEmpty({ message: 'Le type de contrat est requis' })
  postType: string;
}
