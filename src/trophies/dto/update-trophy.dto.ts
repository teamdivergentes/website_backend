import { PartialType } from '@nestjs/mapped-types';
import { CreateTrophyDto } from './create-trophy.dto';

export class UpdateTrophyDto extends PartialType(CreateTrophyDto) {}
