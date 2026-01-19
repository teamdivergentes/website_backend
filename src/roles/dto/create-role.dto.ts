import { IsString, MinLength, IsArray } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2, { message: 'Le nom du rôle doit contenir au moins 2 caractères' })
  name: string;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
