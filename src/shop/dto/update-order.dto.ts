import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '../../../generated/prisma';

export class UpdateOrderDto {
  @IsEnum(OrderStatus, { message: 'Statut de commande invalide' })
  @IsOptional()
  status?: OrderStatus;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Le numéro de suivi ne peut pas dépasser 100 caractères' })
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000, { message: 'La note ne peut pas dépasser 2000 caractères' })
  adminNote?: string;
}
