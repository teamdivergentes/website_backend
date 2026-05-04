import { PartialType } from '@nestjs/mapped-types';
import { CreateCoachingStaffDto } from './create-coaching-staff.dto';

export class UpdateCoachingStaffDto extends PartialType(CreateCoachingStaffDto) {}
