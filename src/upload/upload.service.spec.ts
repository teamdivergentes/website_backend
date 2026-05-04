import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { UploadService } from './upload.service';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
  rename: jest.fn(),
}));

// Mock sharp — la factory retourne un objet chainable
const mockToFile = jest.fn();
const mockResize = jest.fn();
const mockPng = jest.fn();
const mockJpeg = jest.fn();
const mockWebp = jest.fn();

const buildSharpChain = () => ({
  png: mockPng.mockReturnThis(),
  jpeg: mockJpeg.mockReturnThis(),
  webp: mockWebp.mockReturnThis(),
  resize: mockResize.mockReturnThis(),
  toFile: mockToFile,
});

jest.mock('sharp', () => {
  const sharpMock = jest.fn(() => buildSharpChain());
  return sharpMock;
});

import { unlink, rename } from 'fs/promises';
import sharp from 'sharp';

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Réinitialiser les chaînes des mocks sharp
    mockPng.mockReturnThis();
    mockJpeg.mockReturnThis();
    mockWebp.mockReturnThis();
    mockResize.mockReturnThis();
    mockToFile.mockResolvedValue(undefined);

    (unlink as jest.Mock).mockResolvedValue(undefined);
    (rename as jest.Mock).mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadService],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // uploadImage
  // ---------------------------------------------------------------------------
  describe('uploadImage', () => {
    const buildFile = (filename: string): Express.Multer.File =>
      ({
        filename,
        originalname: filename,
        mimetype: 'image/jpeg',
        size: 1024,
      }) as Express.Multer.File;

    it('devrait optimiser un fichier JPEG et retourner url + filename', async () => {
      const file = buildFile('abc123.jpg');

      const result = await service.uploadImage(file);

      expect(sharp).toHaveBeenCalled();
      expect(mockJpeg).toHaveBeenCalled();
      expect(mockResize).toHaveBeenCalled();
      expect(mockToFile).toHaveBeenCalled();
      expect(result.url).toBe('/uploads/abc123.jpg');
      expect(result.filename).toBe('abc123.jpg');
    });

    it('devrait optimiser un fichier PNG et appeler sharp', async () => {
      const file = buildFile('image.png');

      const result = await service.uploadImage(file);

      expect(mockPng).toHaveBeenCalled();
      expect(result.filename).toBe('image.png');
    });

    it('devrait optimiser un fichier WebP et appeler sharp', async () => {
      const file = buildFile('image.webp');

      const result = await service.uploadImage(file);

      expect(mockWebp).toHaveBeenCalled();
      expect(result.filename).toBe('image.webp');
    });

    it('devrait faire un pass-through pour un GIF (pas de sharp)', async () => {
      const file = buildFile('animation.gif');

      const result = await service.uploadImage(file);

      // GIF ne passe pas par sharp.toFile
      expect(mockToFile).not.toHaveBeenCalled();
      expect(result.url).toBe('/uploads/animation.gif');
    });

    it('devrait faire un pass-through pour un SVG (pas de sharp)', async () => {
      const file = buildFile('logo.svg');

      const result = await service.uploadImage(file);

      expect(mockToFile).not.toHaveBeenCalled();
      expect(result.url).toBe('/uploads/logo.svg');
    });

    it('devrait lever InternalServerErrorException si file est undefined', async () => {
      await expect(
        service.uploadImage(undefined as unknown as Express.Multer.File),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('devrait nettoyer le fichier et lever InternalServerErrorException si sharp échoue', async () => {
      const file = buildFile('erreur.jpg');
      mockToFile.mockRejectedValue(new Error('Sharp failure'));
      (unlink as jest.Mock).mockResolvedValue(undefined);

      await expect(service.uploadImage(file)).rejects.toThrow(InternalServerErrorException);
      // deleteImage doit être appelé → unlink invoqué
      expect(unlink).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // deleteImage
  // ---------------------------------------------------------------------------
  describe('deleteImage', () => {
    it('devrait supprimer le fichier avec succès', async () => {
      (unlink as jest.Mock).mockResolvedValue(undefined);

      await service.deleteImage('abc123.jpg');

      expect(unlink).toHaveBeenCalled();
    });

    it('devrait lever NotFoundException si le fichier est introuvable (unlink échoue)', async () => {
      (unlink as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(service.deleteImage('inexistant.jpg')).rejects.toThrow(NotFoundException);
    });

    it('devrait lever NotFoundException si filename est undefined', async () => {
      await expect(service.deleteImage(undefined as unknown as string)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devrait lever NotFoundException si filename est une chaîne vide', async () => {
      await expect(service.deleteImage('')).rejects.toThrow(NotFoundException);
    });

    it('devrait sanitiser le nom de fichier pour éviter la traversée de répertoire', async () => {
      (unlink as jest.Mock).mockResolvedValue(undefined);

      await service.deleteImage('../secret.env');

      // Le slash est remplacé par _ donc le chemin ne peut pas sortir du répertoire uploads
      const calledPath = (unlink as jest.Mock).mock.calls[0][0] as string;
      // La traversée de répertoire via '/' est neutralisée (remplacé par '_')
      expect(calledPath).not.toContain('../');
      expect(calledPath).not.toContain('..\\');
    });
  });
});
