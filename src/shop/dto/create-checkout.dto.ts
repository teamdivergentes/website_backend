import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
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
  // La boutique n'expedie plus qu'en standard : le mode de livraison a disparu
  // du contrat d'entree. `forbidNonWhitelisted` etant global, un client qui
  // enverrait encore `shippingMethod` se voit refuser sa requete plutot que
  // d'etre servi en silence sur un mode qui n'existe plus.

  @IsArray()
  @ArrayNotEmpty({ message: 'Le panier est vide' })
  @ArrayMaxSize(10, { message: 'Le panier ne peut pas contenir plus de 10 lignes' })
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  /**
   * Bon de reduction, facultatif.
   *
   * C'est la seule saisie client qui touche au prix, et elle ne transporte
   * qu'un **identifiant** : la valeur de la remise et ses bornes sont resolues
   * en base. La longueur est bornee ici pour ne pas porter une requete de
   * plusieurs kilo-octets jusqu'a la couche qui interroge la base.
   */
  @IsString()
  @IsOptional()
  @MaxLength(32, { message: 'Ce code de réduction est invalide' })
  discountCode?: string;
}
