import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty({ message: 'Le produit est obligatoire' })
  @MaxLength(100, { message: "L'identifiant produit ne peut pas dépasser 100 caractères" })
  productId: string;

  @IsString()
  @IsOptional()
  @MaxLength(10, { message: 'La taille ne peut pas dépasser 10 caractères' })
  size?: string;

  @IsInt({ message: 'La quantité doit être un entier' })
  @Min(1, { message: 'La quantité minimum est 1' })
  @Max(10, { message: 'La quantité maximum est 10' })
  quantity: number;
}
