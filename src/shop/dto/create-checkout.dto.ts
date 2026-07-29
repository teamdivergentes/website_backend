import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsIn,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FLOCKING_MAX_LENGTH } from '../shop-flocking';

export class CheckoutItemDto {
  @IsInt({ message: 'Le produit est invalide' })
  @Min(1, { message: 'Le produit est invalide' })
  productId: number;

  @IsString()
  @IsNotEmpty({ message: 'La taille est obligatoire' })
  @MaxLength(10, { message: 'La taille ne peut pas dépasser 10 caractères' })
  size: string;

  @IsInt({ message: 'La quantité doit être un entier' })
  @Min(1, { message: 'La quantité minimum est 1' })
  @Max(10, { message: 'La quantité maximum est 10' })
  quantity: number;

  /**
   * Facultatif : ne rien mettre est un choix valide.
   * Le charset et la compatibilite avec le produit sont verifies plus loin
   * (`assertFlockingAllowed`), une fois le produit resolu depuis la base.
   */
  @IsString()
  @IsOptional()
  @MaxLength(FLOCKING_MAX_LENGTH, {
    message: `Le flocage ne peut pas dépasser ${FLOCKING_MAX_LENGTH} caractères`,
  })
  flockingText?: string;
}

export class CreateCheckoutDto {
  /**
   * Mode de livraison retenu. Absent, la commande part en standard : c'est
   * l'option la moins chere pour le client, donc le repli le moins hostile.
   * Le tarif associe n'est jamais lu depuis la requete, seulement le choix.
   */
  @IsOptional()
  @IsIn(['STANDARD', 'EXPRESS'], { message: 'Le mode de livraison est invalide' })
  shippingMethod?: 'STANDARD' | 'EXPRESS';

  @IsArray()
  @ArrayNotEmpty({ message: 'Le panier est vide' })
  @ArrayMaxSize(10, { message: 'Le panier ne peut pas contenir plus de 10 lignes' })
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
}
