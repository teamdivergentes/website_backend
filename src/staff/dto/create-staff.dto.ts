import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject, IsInt, Min } from 'class-validator';
import { StaffCategory } from '../../../generated/prisma';

// Re-export StaffCategory from Prisma for convenience
export { StaffCategory };

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsEnum(StaffCategory)
  category: StaffCategory;

  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @IsObject()
  @IsOptional()
  socials?: {
    twitter?: string;
    discord?: string;
    youtube?: string;
    twitch?: string;
  };
}
