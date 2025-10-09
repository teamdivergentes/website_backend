import {Body, Controller, Get, Post} from '@nestjs/common';
import {UsersService} from "./users.service";
import {User} from 'generated/prisma/client';
import {UserFormDTO} from "./dto/users.dto";

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

    @Get()
    findAll() {
        return this.usersService.findAllUsers();
    }

    @Post()
    create(@Body() data: UserFormDTO): Promise<User> {
        return this.usersService.createUser(data);
    }
}
