import { BadRequestException } from '@nestjs/common';

interface IntegerQueryParamOptions {
  min?: number;
}

export function parseOptionalIntegerQueryParam(
  value: string | undefined,
  message: string,
  options: IntegerQueryParamOptions = {},
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || (options.min !== undefined && parsed < options.min)) {
    throw new BadRequestException(message);
  }

  return parsed;
}
