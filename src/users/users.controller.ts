import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
  Request,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdatePasswordDto,
  AssignRoleDto,
  PaginationDto,
} from './dto/users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface RequestWithUser extends Request {
  user: { id: number };
}

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('admin')
  findAll(@Query() paginationDto: PaginationDto) {
    // If no pagination params, return all users (backward compatibility)
    if (
      !paginationDto.page &&
      !paginationDto.limit &&
      !paginationDto.search &&
      !paginationDto.roleId &&
      paginationDto.actif === undefined
    ) {
      return this.usersService.findAll();
    }
    return this.usersService.findAllPaginated(paginationDto);
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('admin')
  delete(@Param('id', ParseIntPipe) id: number, @Request() req: RequestWithUser) {
    // Prevent self-deletion
    if (req.user.id === id) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte');
    }
    return this.usersService.delete(id);
  }

  @Patch(':id/toggle')
  @Roles('admin')
  toggleActive(@Param('id', ParseIntPipe) id: number, @Request() req: RequestWithUser) {
    // Prevent self-deactivation
    if (req.user.id === id) {
      throw new ForbiddenException('Vous ne pouvez pas désactiver votre propre compte');
    }
    return this.usersService.toggleActive(id);
  }

  @Patch(':id/role')
  @Roles('admin')
  assignRole(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto.roleId);
  }

  @Patch(':id/password')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updatePassword(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePasswordDto) {
    await this.usersService.updatePassword(id, dto);
  }
}
