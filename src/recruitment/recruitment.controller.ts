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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RecruitmentService } from './recruitment.service';
import { CreateRecruitmentDto } from './dto/create-recruitment.dto';
import { UpdateRecruitmentDto } from './dto/update-recruitment.dto';
import { ReorderDto } from './dto/reorder.dto';
import { ApplyRecruitmentDto } from './dto/apply-recruitment.dto';
import { RecruitmentApplicationService } from './recruitment-application.service';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/recruitment')
export class RecruitmentController {
  constructor(
    private readonly recruitmentService: RecruitmentService,
    private readonly applicationService: RecruitmentApplicationService,
  ) {}

  @Public()
  @Get()
  findAllActive() {
    return this.recruitmentService.findAllActive();
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  findAll() {
    return this.recruitmentService.findAll();
  }

  @Public()
  @Post('apply')
  @UseInterceptors(
    FileInterceptor('cv', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        cb(null, allowedMimeTypes.includes(file.mimetype));
      },
    }),
  )
  apply(@Body() dto: ApplyRecruitmentDto, @UploadedFile() cv?: Express.Multer.File) {
    if (!cv) {
      throw new BadRequestException('Le CV est requis');
    }
    return this.applicationService.sendApplication(dto, cv);
  }

  @Public()
  @Get('by-slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.recruitmentService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recruitmentService.findOne(id);
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
