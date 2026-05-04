import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, Matches } from 'class-validator';

export class CreateTwitchChannelDto {
  @IsString()
  @IsNotEmpty({ message: 'Le pseudo Twitch est obligatoire' })
  @Matches(/^[a-zA-Z0-9_]{4,25}$/, {
    message: 'Le pseudo Twitch doit contenir entre 4 et 25 caractères alphanumériques ou _',
  })
  twitchUsername: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  gameLabel?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @IsInt()
  @IsOptional()
  teamMemberId?: number;
}
