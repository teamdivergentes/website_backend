import { IsString, IsNotEmpty, IsOptional, IsObject, IsInt, Min } from 'class-validator';

export class CreateCoachingStaffDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Le rôle est obligatoire' })
  role: string;

  @IsString()
  @IsOptional()
  realName?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  biography?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @IsObject()
  @IsOptional()
  socials?: Record<string, string>;

  @IsString()
  @IsOptional()
  slug?: string;
}
