import {BadRequestException, Injectable} from '@nestjs/common';
import {UsersService} from "../users/users.service";
import {JwtService} from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(
      private usersService: UsersService,
      private jwtService: JwtService
  ) {}

  async signIn(email: string, pwd: string): Promise<{ access_token: string }> {
    const user = await this.usersService.validateUser(email, pwd);

    if (user) {
      const payload = { sub: user.id, email: user.email };
      const jwtToken = await this.jwtService.signAsync(payload);
      return {access_token: jwtToken}
    } else {
      throw new BadRequestException();
    }
  }
}
