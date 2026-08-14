import { IsBoolean, IsEmail, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

export class UpdateShopSettingsDto {
  /**
   * Plafond volontaire : une saisie a 5 chiffres est une faute de frappe
   * (centimes pris pour des euros), pas un tarif de port.
   */
  @IsOptional()
  @IsInt({ message: 'Le port standard doit être un entier (en centimes)' })
  @Min(0, { message: 'Le port standard ne peut pas être négatif' })
  @Max(50000, { message: 'Le port standard ne peut pas dépasser 500 €' })
  shippingStandardCents?: number;

  /** 0 desactive la franchise plutot que d'offrir le port a tout le monde. */
  @IsOptional()
  @IsInt({ message: 'Le seuil de port offert doit être un entier (en centimes)' })
  @Min(0, { message: 'Le seuil de port offert ne peut pas être négatif' })
  @Max(1000000, { message: 'Le seuil de port offert ne peut pas dépasser 10 000 €' })
  freeShippingThresholdCents?: number;

  // --- Couts internes -------------------------------------------------
  // Jamais exposes au public : ils ne servent qu'au calcul de marge.
  @IsOptional()
  @IsInt({ message: 'Le coût de production doit être un entier (en centimes)' })
  @Min(0)
  @Max(1000000)
  costProductionCents?: number;

  @IsOptional()
  @IsInt({ message: 'La commission partenaire doit être un entier (en centimes)' })
  @Min(0)
  @Max(1000000)
  costPartnerCents?: number;

  @IsOptional()
  @IsBoolean({ message: 'La commission partenaire doit être activée ou non' })
  costPartnerEnabled?: boolean;

  @IsOptional()
  @IsInt({ message: 'Les frais ecommerce doivent être un entier (en centimes)' })
  @Min(0)
  @Max(1000000)
  costEcommerceCents?: number;

  @IsOptional()
  @IsInt({ message: 'Le coût de flocage doit être un entier (en centimes)' })
  @Min(0)
  @Max(1000000)
  costFlockingCents?: number;

  @IsOptional()
  @IsInt({ message: 'Le coût du port standard doit être un entier (en centimes)' })
  @Min(0)
  @Max(1000000)
  costShippingStandardCents?: number;

  /** Chaine vide acceptee pour effacer le destinataire. */
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsEmail({}, { message: "L'adresse de notification est invalide" })
  ordersNotifyEmail?: string;

  @IsOptional()
  @IsBoolean({ message: "L'ouverture de la boutique doit être un booléen" })
  shopEnabled?: boolean;
}
