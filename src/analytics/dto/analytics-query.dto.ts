// FIX [ALPHA-008] Validation que endDate >= startDate via un décorateur custom
import {
  IsDateString,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * FIX [ALPHA-008] Décorateur de validation personnalisé qui vérifie que
 * la date de fin est supérieure ou égale à la date de début.
 * S'applique sur la propriété endDate et reçoit le nom de la propriété startDate.
 */
function IsAfterOrEqual(startDateProperty: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterOrEqual',
      target: (object as { constructor: new (...args: unknown[]) => unknown }).constructor,
      propertyName,
      constraints: [startDateProperty],
      options: {
        message: `La date de fin doit être supérieure ou égale à la date de début.`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];
          if (typeof value !== 'string' || typeof relatedValue !== 'string') return false;
          return new Date(value) >= new Date(relatedValue);
        },
      },
    });
  };
}

export class AnalyticsQueryDto {
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format de date invalide, utilisez YYYY-MM-DD' })
  startDate: string;

  // FIX [ALPHA-008] Validation que endDate >= startDate
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format de date invalide, utilisez YYYY-MM-DD' })
  @IsAfterOrEqual('startDate')
  endDate: string;
}

export class TopPagesQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
