import {
  BadRequestException,
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { UploadService } from './upload.service';
import { multerConfig } from './multer.config';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/upload')
@UseGuards(RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @Roles('admin')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    return this.uploadService.uploadImage(file);
  }

  /**
   * Endpoint dédié à l'outil image d'Editor.js.
   * Retourne le format attendu par le plugin @editorjs/image :
   * { success: 1, file: { url: "..." } }
   */
  @Post('image-editor')
  @Roles('admin')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadImageForEditor(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    const result = await this.uploadService.uploadImage(file);
    return {
      success: 1,
      file: { url: result.url },
    };
  }

  @Delete(':filename')
  @Roles('admin')
  async deleteImage(@Param('filename') filename: string) {
    await this.uploadService.deleteImage(filename);
    return { message: 'Image supprimée avec succès' };
  }
}
