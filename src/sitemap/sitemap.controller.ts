import { Controller, Get, Header, BadGatewayException } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SitemapService } from './sitemap.service';

@Controller()
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Public()
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async getSitemap(): Promise<string> {
    const rawUrl = process.env.SITE_URL ?? 'https://teamdivergentes.fr';
    try {
      new URL(rawUrl);
    } catch {
      throw new BadGatewayException('SITE_URL invalide');
    }

    return this.sitemapService.generateSitemapXml(rawUrl);
  }
}
