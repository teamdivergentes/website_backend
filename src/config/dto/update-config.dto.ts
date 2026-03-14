import { IsString, IsNotEmpty, IsOptional, MaxLength, Matches } from 'class-validator';

export class UpdateConfigDto {
  @IsString()
  @MaxLength(10000, { message: 'La valeur ne peut pas dépasser 10000 caractères' })
  value: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'La description ne peut pas dépasser 500 caractères' })
  description?: string;
}

export class CreateConfigDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'La clé ne peut contenir que des lettres minuscules, chiffres et underscores',
  })
  key: string;

  @IsString()
  @MaxLength(10000, { message: 'La valeur ne peut pas dépasser 10000 caractères' })
  value: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'La description ne peut pas dépasser 500 caractères' })
  description?: string;
}
