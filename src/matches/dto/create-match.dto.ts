import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUrl,
  Min,
  Max,
  MaxLength,
  IsDateString,
  Matches,
} from 'class-validator';

// Règle scores appariés : vit dans le SERVICE (see matches.service.ts).
// Raison : @ValidateIf croisé dans le DTO ne couvre pas les 2 sens de façon symétrique
// et lisible. La règle "les deux ou aucun" est une invariante métier gérée dans create() et update().

export class CreateMatchDto {
  @IsInt({ message: "L'équipe est obligatoire" })
  @Min(1)
  teamId: number;

  @IsString()
  @IsNotEmpty({ message: "Le nom de l'adversaire est obligatoire" })
  @MaxLength(100, { message: "Le nom de l'adversaire ne peut pas dépasser 100 caractères" })
  opponentName: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: "Le logo de l'adversaire ne peut pas dépasser 500 caractères" })
  @Matches(/^(\/uploads\/|https?:\/\/)/, {
    message: 'Le logo doit être un chemin /uploads/ ou une URL http(s)',
  })
  opponentLogo?: string;

  @IsDateString({}, { message: 'La date du match doit être une date valide' })
  scheduledAt: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'La compétition ne peut pas dépasser 200 caractères' })
  competition?: string;

  @IsUrl({ require_protocol: true }, { message: "L'URL du stream doit être une URL valide" })
  @IsOptional()
  streamUrl?: string;

  @IsInt({ message: 'Le score DVG doit être un entier' })
  @Min(0, { message: 'Le score DVG doit être positif ou nul' })
  @Max(999, { message: 'Le score DVG ne peut pas dépasser 999' })
  @IsOptional()
  scoreDvg?: number;

  @IsInt({ message: "Le score de l'adversaire doit être un entier" })
  @Min(0, { message: "Le score de l'adversaire doit être positif ou nul" })
  @Max(999, { message: "Le score de l'adversaire ne peut pas dépasser 999" })
  @IsOptional()
  scoreOpponent?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  articleId?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
