import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class AddImageDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  alt?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isPrimary?: boolean;
}
