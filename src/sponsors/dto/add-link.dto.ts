import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { LinkType } from '../../../generated/prisma';

export class AddLinkDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsEnum(LinkType)
  type: LinkType;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isPrimary?: boolean;
}
