import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsOptional()
  realName?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsObject()
  @IsOptional()
  socials?: {
    twitter?: string;
    discord?: string;
    youtube?: string;
    twitch?: string;
    instagram?: string;
  };
}
