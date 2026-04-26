import { IsString, IsNotEmpty, IsUrl, MaxLength } from 'class-validator';

export class LinkMetaQueryDto {
  @IsString()
  @IsNotEmpty({ message: "L'URL est obligatoire" })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: "L'URL doit être une URL HTTP ou HTTPS valide" },
  )
  @MaxLength(2048, { message: "L'URL ne peut pas dépasser 2048 caractères" })
  url: string;
}
