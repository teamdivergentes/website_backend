import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsInt,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateCoachingStaffDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Le rôle est obligatoire' })
  @MaxLength(100, { message: 'Le rôle ne peut pas dépasser 100 caractères' })
  role: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Le nom réel ne peut pas dépasser 100 caractères' })
  realName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: "L'image ne peut pas dépasser 500 caractères" })
  image?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000, { message: 'La biographie ne peut pas dépasser 2000 caractères' })
  biography?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @IsObject()
  @IsOptional()
  socials?: Record<string, string>;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Le slug ne peut pas dépasser 100 caractères' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug doit etre kebab-case (lettres minuscules, chiffres et tirets)',
  })
  slug?: string;
}
