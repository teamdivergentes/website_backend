import { IsString, MinLength, IsArray, IsOptional } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Le nom du rôle doit contenir au moins 2 caractères' })
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
