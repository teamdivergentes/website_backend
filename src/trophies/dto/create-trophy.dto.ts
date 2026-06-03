import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsDateString,
  Matches,
} from 'class-validator';

export class CreateTrophyDto {
  @IsString()
  @IsNotEmpty({ message: 'La compétition est obligatoire' })
  @MaxLength(200, { message: 'La compétition ne peut pas dépasser 200 caractères' })
  competition: string;

  @IsInt({ message: 'Le placement doit être un entier' })
  @Min(1, { message: 'Le placement minimum est 1' })
  @Max(999, { message: 'Le placement maximum est 999' })
  placement: number;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'La description ne peut pas dépasser 500 caractères' })
  description?: string;

  @IsDateString({}, { message: "La date d'obtention doit être une date valide" })
  date: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: "L'image ne peut pas dépasser 500 caractères" })
  @Matches(/^(\/uploads\/|https?:\/\/)/, {
    message: "L'image doit être un chemin /uploads/ ou une URL http(s)",
  })
  image?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsInt()
  @Min(1, { message: "L'identifiant d'équipe doit être un entier positif" })
  @IsOptional()
  teamId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: "Le libellé d'équipe ne peut pas dépasser 100 caractères" })
  teamLabel?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
