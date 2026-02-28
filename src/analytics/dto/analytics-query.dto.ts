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

const GA4_START_DATE = '2020-01-01';
const MAX_RANGE_DAYS = 730;

function IsAfterOrEqual(startDateProperty: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterOrEqual',
      target: (object as { constructor: new (...args: unknown[]) => unknown }).constructor,
      propertyName,
      constraints: [startDateProperty],
      options: {
        message: 'La date de fin doit être supérieure ou égale à la date de début.',
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

function IsNotBeforeGa4Start(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotBeforeGa4Start',
      target: (object as { constructor: new (...args: unknown[]) => unknown }).constructor,
      propertyName,
      options: {
        message: `La date de début ne peut pas être antérieure au ${GA4_START_DATE} (date de début de GA4).`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          return new Date(value) >= new Date(GA4_START_DATE);
        },
      },
    });
  };
}

function IsNotInFuture(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotInFuture',
      target: (object as { constructor: new (...args: unknown[]) => unknown }).constructor,
      propertyName,
      options: {
        message: "La date de fin ne peut pas être dans le futur.",
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          return new Date(value) <= today;
        },
      },
    });
  };
}

function IsRangeAtMost(startDateProperty: string, maxDays: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRangeAtMost',
      target: (object as { constructor: new (...args: unknown[]) => unknown }).constructor,
      propertyName,
      constraints: [startDateProperty, maxDays],
      options: {
        message: `La plage de dates ne peut pas dépasser ${maxDays} jours.`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName, days] = args.constraints as [string, number];
          const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];
          if (typeof value !== 'string' || typeof relatedValue !== 'string') return false;
          const diffMs = new Date(value).getTime() - new Date(relatedValue).getTime();
          return diffMs <= days * 86400000;
        },
      },
    });
  };
}

export class AnalyticsQueryDto {
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format de date invalide, utilisez YYYY-MM-DD' })
  @IsNotBeforeGa4Start()
  startDate: string;

  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format de date invalide, utilisez YYYY-MM-DD' })
  @IsAfterOrEqual('startDate')
  @IsNotInFuture()
  @IsRangeAtMost('startDate', MAX_RANGE_DAYS)
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
