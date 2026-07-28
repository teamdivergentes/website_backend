import { IsBoolean, IsEmail, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

export class UpdateShopSettingsDto {
  /**
   * Plafond volontaire : une saisie a 5 chiffres est une faute de frappe
   * (centimes pris pour des euros), pas un tarif de port.
   */
  @IsOptional()
  @IsInt({ message: 'Les frais de port doivent être un entier (en centimes)' })
  @Min(0, { message: 'Les frais de port ne peuvent pas être négatifs' })
  @Max(50000, { message: 'Les frais de port ne peuvent pas dépasser 500 €' })
  shippingFeeCents?: number;

  /** Chaine vide acceptee pour effacer le destinataire. */
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsEmail({}, { message: "L'adresse de notification est invalide" })
  ordersNotifyEmail?: string;

  @IsOptional()
  @IsBoolean({ message: "L'ouverture de la boutique doit être un booléen" })
  shopEnabled?: boolean;
}
