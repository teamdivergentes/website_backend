import { PartialType } from '@nestjs/mapped-types';
import { AddLinkDto } from './add-link.dto';

export class UpdateLinkDto extends PartialType(AddLinkDto) {}
