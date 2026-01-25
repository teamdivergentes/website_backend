import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateConfigDto {
  @IsString()
  value: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateConfigDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  value: string;

  @IsString()
  @IsOptional()
  description?: string;
}
