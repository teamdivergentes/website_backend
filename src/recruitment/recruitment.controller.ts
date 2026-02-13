import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';
import { CreateRecruitmentDto } from './dto/create-recruitment.dto';
import { UpdateRecruitmentDto } from './dto/update-recruitment.dto';
import { ReorderDto } from './dto/reorder.dto';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/recruitment')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Public()
  @Get()
  findAllActive() {
    return this.recruitmentService.findAllActive();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recruitmentService.findOne(id);
  }

  @Get('admin/all')
  findAll() {
    return this.recruitmentService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateRecruitmentDto) {
    return this.recruitmentService.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRecruitmentDto) {
    return this.recruitmentService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.recruitmentService.delete(id);
  }

  @Patch(':id/toggle')
  @UseGuards(RolesGuard)
  @Roles('admin')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.recruitmentService.toggleActive(id);
  }

  @Patch('reorder')
  @UseGuards(RolesGuard)
  @Roles('admin')
  reorder(@Body() dto: ReorderDto) {
    return this.recruitmentService.reorder(dto);
  }
}
