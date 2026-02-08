import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

@Injectable()
export class UploadService {
  private readonly uploadPath = './uploads';

  async uploadImage(file: Express.Multer.File): Promise<{ url: string; filename: string }> {
    if (!file) {
      throw new InternalServerErrorException('Aucun fichier fourni');
    }

    try {
      // Optimize image with sharp
      const optimizedPath = await this.optimizeImage(file.filename);

      return {
        url: `/uploads/${optimizedPath}`,
        filename: optimizedPath,
      };
    } catch {
      // Clean up file if optimization fails
      await this.deleteImage(file.filename);
      throw new InternalServerErrorException("Erreur lors de l'optimisation de l'image");
    }
  }

  async optimizeImage(filename: string): Promise<string> {
    const filePath = join(this.uploadPath, filename);
    const ext = filename.split('.').pop()?.toLowerCase();

    // Configuration optimization based on format
    const sharpInstance = sharp(filePath);

    if (ext === 'png') {
      await sharpInstance
        .png({ quality: 85, compressionLevel: 9 })
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .toFile(filePath + '.optimized');
    } else if (ext === 'gif') {
      // Keep original GIF (no optimization to preserve animation)
      return filename;
    } else if (ext === 'svg') {
      // Keep original SVG (vector format, no optimization needed)
      return filename;
    } else {
      // JPEG, WEBP
      await sharpInstance
        .jpeg({ quality: 85, progressive: true })
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .toFile(filePath + '.optimized');
    }

    // Replace original with optimized
    await unlink(filePath);
    await sharp(filePath + '.optimized').toFile(filePath);
    await unlink(filePath + '.optimized');

    return filename;
  }

  async deleteImage(filename: string): Promise<void> {
    if (!filename) {
      throw new NotFoundException('Nom de fichier manquant');
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = join(this.uploadPath, sanitizedFilename);

    try {
      await unlink(filePath);
    } catch {
      throw new NotFoundException('Fichier non trouvé');
    }
  }
}
