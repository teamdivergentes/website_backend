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
import { SkipThrottle } from '@nestjs/throttler';
import { SponsorsService } from './sponsors.service';
import { SponsorImagesService } from './sponsor-images.service';
import { SponsorLinksService } from './sponsor-links.service';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { UpdateSponsorDto } from './dto/update-sponsor.dto';
import { AddImageDto } from './dto/add-image.dto';
import { AddLinkDto } from './dto/add-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { ReorderSponsorsDto } from './dto/reorder.dto';
import { ReorderImagesDto } from './dto/reorder-images.dto';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/sponsors')
export class SponsorsController {
  constructor(
    private readonly sponsorsService: SponsorsService,
    private readonly sponsorImagesService: SponsorImagesService,
    private readonly sponsorLinksService: SponsorLinksService,
  ) {}

  /**
   * GET /api/sponsors - Liste tous les sponsors actifs (public)
   */
  @Public()
  @SkipThrottle()
  @Get()
  findAllActive() {
    return this.sponsorsService.findAllActive();
  }

  /**
   * GET /api/sponsors/admin/all - Liste tous les sponsors pour l'admin (admin)
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  findAll() {
    return this.sponsorsService.findAll();
  }

  /**
   * GET /api/sponsors/:slug - Récupère un sponsor par son slug (public)
   */
  @Public()
  @SkipThrottle()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.sponsorsService.findBySlug(slug);
  }

  /**
   * POST /api/sponsors - Crée un sponsor (admin)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() createSponsorDto: CreateSponsorDto) {
    return this.sponsorsService.create(createSponsorDto);
  }

  /**
   * PUT /api/sponsors/:id - Met à jour un sponsor (admin)
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSponsorDto: UpdateSponsorDto) {
    return this.sponsorsService.update(id, updateSponsorDto);
  }

  /**
   * DELETE /api/sponsors/:id - Supprime un sponsor (admin)
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.sponsorsService.delete(id);
  }

  /**
   * PATCH /api/sponsors/:id/toggle - Active/désactive un sponsor (admin)
   */
  @Patch(':id/toggle')
  @UseGuards(RolesGuard)
  @Roles('admin')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.sponsorsService.toggleActive(id);
  }

  /**
   * PATCH /api/sponsors/reorder - Réordonne les sponsors (admin)
   */
  @Patch('reorder')
  @UseGuards(RolesGuard)
  @Roles('admin')
  reorder(@Body() reorderDto: ReorderSponsorsDto) {
    return this.sponsorsService.reorder(reorderDto);
  }

  /**
   * POST /api/sponsors/:id/images - Ajoute une image (admin)
   */
  @Post(':id/images')
  @UseGuards(RolesGuard)
  @Roles('admin')
  addImage(@Param('id', ParseIntPipe) sponsorId: number, @Body() addImageDto: AddImageDto) {
    return this.sponsorImagesService.addImage(sponsorId, addImageDto);
  }

  /**
   * DELETE /api/sponsors/:id/images/:imageId - Supprime une image (admin)
   */
  @Delete(':id/images/:imageId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  removeImage(
    @Param('id', ParseIntPipe) sponsorId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.sponsorImagesService.removeImage(sponsorId, imageId);
  }

  /**
   * PATCH /api/sponsors/:id/images/:imageId/primary - Définit l'image principale (admin)
   */
  @Patch(':id/images/:imageId/primary')
  @UseGuards(RolesGuard)
  @Roles('admin')
  setPrimaryImage(
    @Param('id', ParseIntPipe) sponsorId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.sponsorImagesService.setPrimaryImage(sponsorId, imageId);
  }

  /**
   * PATCH /api/sponsors/:id/images/reorder - Réordonne les images (admin)
   */
  @Patch(':id/images/reorder')
  @UseGuards(RolesGuard)
  @Roles('admin')
  reorderImages(
    @Param('id', ParseIntPipe) sponsorId: number,
    @Body() reorderImagesDto: ReorderImagesDto,
  ) {
    return this.sponsorImagesService.reorderImages(sponsorId, reorderImagesDto.orderedIds);
  }

  /**
   * POST /api/sponsors/:id/links - Ajoute un lien (admin)
   */
  @Post(':id/links')
  @UseGuards(RolesGuard)
  @Roles('admin')
  addLink(@Param('id', ParseIntPipe) sponsorId: number, @Body() addLinkDto: AddLinkDto) {
    return this.sponsorLinksService.addLink(sponsorId, addLinkDto);
  }

  /**
   * PUT /api/sponsors/:id/links/:linkId - Met à jour un lien (admin)
   */
  @Put(':id/links/:linkId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateLink(
    @Param('id', ParseIntPipe) sponsorId: number,
    @Param('linkId', ParseIntPipe) linkId: number,
    @Body() updateLinkDto: UpdateLinkDto,
  ) {
    return this.sponsorLinksService.updateLink(sponsorId, linkId, updateLinkDto);
  }

  /**
   * DELETE /api/sponsors/:id/links/:linkId - Supprime un lien (admin)
   */
  @Delete(':id/links/:linkId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  removeLink(
    @Param('id', ParseIntPipe) sponsorId: number,
    @Param('linkId', ParseIntPipe) linkId: number,
  ) {
    return this.sponsorLinksService.removeLink(sponsorId, linkId);
  }
}
