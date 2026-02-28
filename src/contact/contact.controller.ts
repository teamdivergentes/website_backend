import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 messages per minute
  async sendContact(@Body() contactDto: ContactDto) {
    return this.contactService.sendContact(contactDto);
  }
}
