import { IsString, IsNotEmpty, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  game: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  banner?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean;

  @IsObject()
  @IsOptional()
  socials?: {
    twitter?: string;
    discord?: string;
    youtube?: string;
    twitch?: string;
    instagram?: string;
    website?: string;
  };
}
