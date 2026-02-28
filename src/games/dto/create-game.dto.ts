import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGameDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  position?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean;
}
