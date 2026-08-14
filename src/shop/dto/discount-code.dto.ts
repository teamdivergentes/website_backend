import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DiscountType } from '../../../generated/prisma';
import { CODE_PATTERN } from '../shop-discount';

/**
 * Toutes les options d'un bon de reduction se reglent au meme endroit.
 *
 * Convention constante sur les quatre bornes optionnelles : **vide vaut « pas
 * de limite », jamais « limite a zero »**. C'est deja la lecture retenue pour
 * le seuil de franchise de port, et changer de convention d'un ecran a l'autre
 * ferait qu'un champ vide produirait tantot l'effet attendu, tantot son
 * inverse.
 */
export class CreateDiscountCodeDto {
  /**
   * Le code, saisi a la main ou repris du generateur. Il est normalise en
   * majuscules cote service : la validation porte donc sur la forme, pas sur
   * la casse.
   */
  @IsString()
  @IsNotEmpty({ message: 'Le code est obligatoire' })
  @MaxLength(32)
  @Matches(CODE_PATTERN, {
    message: 'Le code ne peut contenir que des lettres, chiffres et tirets (3 à 32 caractères)',
  })
  code: string;

  @IsEnum(DiscountType, { message: 'Le type de remise est invalide' })
  type: DiscountType;

  /**
   * Centimes pour `FIXED`, points de pourcentage pour `PERCENTAGE`. Le plafond
   * commun aux deux natures est volontairement large : c'est le service qui
   * borne le pourcentage a 100, le DTO ne connait pas le type au moment ou il
   * valide ce champ.
   */
  @IsInt({ message: 'La valeur de la remise doit être un entier' })
  @Min(1, { message: 'La valeur de la remise doit être supérieure à zéro' })
  @Max(500000)
  value: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500000)
  minSubtotalCents?: number | null;

  @IsOptional()
  @IsDateString({}, { message: 'La date de début est invalide' })
  startsAt?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'La date de fin est invalide' })
  endsAt?: string | null;

  /** `1` fait un code a usage unique. Vide, le code est illimite. */
  @IsOptional()
  @IsInt({ message: 'Le quota doit être un entier' })
  @Min(1, { message: 'Le quota doit être au moins de 1' })
  @Max(100000)
  maxUses?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/**
 * Le code lui-meme n'est pas modifiable une fois qu'il a servi — le service le
 * refuse. Il reste dans le contrat d'entree parce qu'un code jamais utilise
 * doit pouvoir etre corrige apres une faute de frappe.
 */
export class UpdateDiscountCodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(CODE_PATTERN, {
    message: 'Le code ne peut contenir que des lettres, chiffres et tirets (3 à 32 caractères)',
  })
  code?: string;

  @IsOptional()
  @IsEnum(DiscountType, { message: 'Le type de remise est invalide' })
  type?: DiscountType;

  @IsOptional()
  @IsInt({ message: 'La valeur de la remise doit être un entier' })
  @Min(1)
  @Max(500000)
  value?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500000)
  minSubtotalCents?: number | null;

  @IsOptional()
  @IsDateString({}, { message: 'La date de début est invalide' })
  startsAt?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'La date de fin est invalide' })
  endsAt?: string | null;

  @IsOptional()
  @IsInt({ message: 'Le quota doit être un entier' })
  @Min(1)
  @Max(100000)
  maxUses?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
