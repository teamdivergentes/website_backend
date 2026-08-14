import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Un visuel de la galerie. L'ordre du tableau fait l'ordre d'affichage : la
 * position n'est pas transmise, elle serait une seconde source de verite que
 * rien ne garantirait coherente avec l'ordre recu.
 */
export class ShopProductImageDto {
  @IsString()
  @IsNotEmpty({ message: "L'adresse du visuel est obligatoire" })
  @MaxLength(300)
  url: string;

  @IsString()
  @IsNotEmpty({ message: 'Le libellé du visuel est obligatoire' })
  @MaxLength(40)
  label: string;

  @IsOptional()
  @IsBoolean()
  isBack?: boolean;

  @IsOptional()
  @IsBoolean()
  isCard?: boolean;
}

export class CreateShopProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Le slug est obligatoire' })
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Le slug ne peut contenir que des minuscules, chiffres et tirets',
  })
  slug: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  shortDescription?: string;

  /** Texte brut : il est rendu par interpolation cote front, jamais en innerHTML. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsInt({ message: 'Le prix doit être un entier (en centimes)' })
  @Min(0, { message: 'Le prix ne peut pas être négatif' })
  @Max(500000, { message: 'Le prix ne peut pas dépasser 5 000 €' })
  priceCents: number;

  /**
   * Prix promotionnel. `null` met fin a la promotion en cours ; il doit rester
   * accepte, sans quoi une promotion ne pourrait plus etre retiree.
   */
  @IsOptional()
  @IsInt({ message: 'Le prix promotionnel doit être un entier (en centimes)' })
  @Min(0, { message: 'Le prix promotionnel ne peut pas être négatif' })
  @Max(500000)
  promoPriceCents?: number | null;

  @IsOptional()
  @IsDateString({}, { message: 'La date de début de promotion est invalide' })
  promoStartsAt?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'La date de fin de promotion est invalide' })
  promoEndsAt?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ShopProductImageDto)
  images?: ShopProductImageDto[];

  @IsOptional()
  @IsBoolean()
  allowFlocking?: boolean;

  @IsOptional()
  @IsInt({ message: 'Le surcoût de flocage doit être un entier (en centimes)' })
  @Min(0)
  @Max(100000)
  flockingFeeCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  flockingTopPct?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  flockingLeftPct?: number;

  @IsOptional()
  @IsInt()
  teamId?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsArray()
  @ArrayNotEmpty({ message: 'Au moins une taille est obligatoire' })
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  sizes: string[];
}

export class UpdateShopProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsInt({ message: 'Le prix doit être un entier (en centimes)' })
  @Min(0)
  @Max(500000)
  priceCents?: number;

  /**
   * Prix promotionnel. `null` met fin a la promotion en cours ; il doit rester
   * accepte, sans quoi une promotion ne pourrait plus etre retiree.
   */
  @IsOptional()
  @IsInt({ message: 'Le prix promotionnel doit être un entier (en centimes)' })
  @Min(0, { message: 'Le prix promotionnel ne peut pas être négatif' })
  @Max(500000)
  promoPriceCents?: number | null;

  @IsOptional()
  @IsDateString({}, { message: 'La date de début de promotion est invalide' })
  promoStartsAt?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'La date de fin de promotion est invalide' })
  promoEndsAt?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ShopProductImageDto)
  images?: ShopProductImageDto[];

  @IsOptional()
  @IsBoolean()
  allowFlocking?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  flockingFeeCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  flockingTopPct?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  flockingLeftPct?: number;

  @IsOptional()
  @IsInt()
  teamId?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'Au moins une taille est obligatoire' })
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  sizes?: string[];
}
