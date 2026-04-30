import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SponsorLinksService } from './sponsor-links.service';
import { PrismaService } from '../prisma.service';
import { LinkType, Prisma } from '../../generated/prisma';

describe('SponsorLinksService', () => {
  let service: SponsorLinksService;

  const mockPrismaService = {
    sponsorLink: {
      findFirst: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SponsorLinksService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<SponsorLinksService>(SponsorLinksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addLink', () => {
    it('should create a link for a sponsor', async () => {
      const mockLink = {
        id: 1,
        url: 'https://example.com',
        label: 'Site officiel',
        type: LinkType.WEBSITE,
        isPrimary: false,
        sponsorId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.sponsorLink.create.mockResolvedValue(mockLink);

      const result = await service.addLink(1, {
        url: 'https://example.com',
        label: 'Site officiel',
        type: LinkType.WEBSITE,
        isPrimary: false,
      });

      expect(mockPrismaService.sponsorLink.create).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ data: expect.objectContaining({ sponsorId: 1 }) }),
      );
      expect(result).toEqual(mockLink);
    });

    it('should unset existing primary links when isPrimary is true', async () => {
      mockPrismaService.sponsorLink.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.sponsorLink.create.mockResolvedValue({ id: 2, isPrimary: true });

      await service.addLink(1, {
        url: 'https://promo.com',
        label: 'Promo',
        type: LinkType.PROMO_CODE,
        isPrimary: true,
      });

      expect(mockPrismaService.sponsorLink.updateMany).toHaveBeenCalledWith({
        where: { sponsorId: 1, isPrimary: true },
        data: { isPrimary: false },
      });
    });

    it('should not unset primary links when isPrimary is false', async () => {
      mockPrismaService.sponsorLink.create.mockResolvedValue({ id: 3, isPrimary: false });

      await service.addLink(1, {
        url: 'https://example.com',
        label: 'Lien',
        type: LinkType.OTHER,
        isPrimary: false,
      });

      expect(mockPrismaService.sponsorLink.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('updateLink', () => {
    it('should update a link', async () => {
      const existingLink = {
        id: 1,
        url: 'https://old.com',
        label: 'Ancien',
        type: LinkType.WEBSITE,
        isPrimary: false,
        sponsorId: 1,
      };
      const updatedLink = { ...existingLink, url: 'https://new.com', label: 'Nouveau' };

      mockPrismaService.sponsorLink.findFirst.mockResolvedValue(existingLink);
      mockPrismaService.sponsorLink.update.mockResolvedValue(updatedLink);

      const result = await service.updateLink(1, 1, {
        url: 'https://new.com',
        label: 'Nouveau',
        type: LinkType.WEBSITE,
        isPrimary: false,
      });

      expect(result).toEqual(updatedLink);
    });

    it('should throw NotFoundException when link does not belong to sponsor', async () => {
      mockPrismaService.sponsorLink.findFirst.mockResolvedValue(null);

      await expect(
        service.updateLink(1, 999, { url: 'https://x.com', label: 'X', type: LinkType.OTHER }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should unset other primary links when setting isPrimary true', async () => {
      const existingLink = { id: 1, sponsorId: 1, isPrimary: false };

      mockPrismaService.sponsorLink.findFirst.mockResolvedValue(existingLink);
      mockPrismaService.sponsorLink.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.sponsorLink.update.mockResolvedValue({ ...existingLink, isPrimary: true });

      await service.updateLink(1, 1, {
        url: 'https://x.com',
        label: 'X',
        type: LinkType.WEBSITE,
        isPrimary: true,
      });

      expect(mockPrismaService.sponsorLink.updateMany).toHaveBeenCalledWith({
        where: { sponsorId: 1, isPrimary: true },
        data: { isPrimary: false },
      });
    });
  });

  describe('removeLink', () => {
    it('should delete a link', async () => {
      const mockLink = { id: 1, sponsorId: 1 };
      mockPrismaService.sponsorLink.delete.mockResolvedValue(mockLink);

      const result = await service.removeLink(1, 1);

      expect(mockPrismaService.sponsorLink.delete).toHaveBeenCalledWith({
        where: { id: 1, sponsorId: 1 },
      });
      expect(result).toEqual({ message: 'Lien supprimé avec succès' });
    });

    it('should throw NotFoundException when link not found', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      mockPrismaService.sponsorLink.delete.mockRejectedValue(prismaError);

      await expect(service.removeLink(1, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
