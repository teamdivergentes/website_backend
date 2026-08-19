import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

@Injectable()
export class UploadService {
  private readonly uploadPath = './uploads';

  async uploadImage(file: Express.Multer.File): Promise<{ url: string; filename: string }> {
    if (!file) {
      throw new InternalServerErrorException('Aucun fichier fourni');
    }

    try {
      // L'optimisation se fait SUR PLACE : le fichier optimise remplace
      // l'original sous le meme nom. Le nom de sortie est donc celui d'entree,
      // et le faire transiter par une valeur de retour laissait croire que la
      // methode pouvait en rendre un autre.
      await this.optimizeImage(file.filename);

      return {
        url: `/uploads/${file.filename}`,
        filename: file.filename,
      };
    } catch {
      // Clean up file if optimization fails
      await this.deleteImage(file.filename);
      throw new InternalServerErrorException("Erreur lors de l'optimisation de l'image");
    }
  }

  /**
   * Optimise l'image en place : le resultat remplace l'original sous le meme
   * nom. Ne rend rien — l'appelant connait deja le nom du fichier qu'il a
   * transmis, et la methode ne peut pas en produire un autre.
   */
  async optimizeImage(filename: string): Promise<void> {
    const filePath = join(this.uploadPath, filename);
    const ext = filename.split('.').pop()?.toLowerCase();

    // Configuration optimization based on format
    const sharpInstance = sharp(filePath);

    if (ext === 'png') {
      await sharpInstance
        .png({ compressionLevel: 9 })
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .toFile(filePath + '.optimized');
    } else if (ext === 'gif') {
      // Keep original GIF (no optimization to preserve animation)
      return;
    } else if (ext === 'svg') {
      // Keep original SVG (vector format, no optimization needed)
      return;
    } else if (ext === 'webp') {
      await sharpInstance
        .webp({ quality: 92 })
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .toFile(filePath + '.optimized');
    } else {
      // JPEG
      await sharpInstance
        .jpeg({ quality: 92, progressive: true })
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .toFile(filePath + '.optimized');
    }

    // Replace original with optimized
    await unlink(filePath);
    await rename(filePath + '.optimized', filePath);
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
