import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto/profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { id: number };
}

@Controller('api/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  getProfile(@Request() req: RequestWithUser) {
    return this.profileService.getProfile(req.user.id);
  }

  @Put()
  updateProfile(@Request() req: RequestWithUser, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.id, dto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@Request() req: RequestWithUser, @Body() dto: ChangePasswordDto) {
    await this.profileService.changePassword(req.user.id, dto);
  }
}
