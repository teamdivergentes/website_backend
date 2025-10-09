import {Body, Controller, HttpCode, HttpStatus, Post} from '@nestjs/common';
import { AuthPayloadDto } from './dto/auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() authPayload: AuthPayloadDto): Promise<{ access_token: string }> {
    return this.authService.signIn(authPayload.email, authPayload.password);
  }
}
