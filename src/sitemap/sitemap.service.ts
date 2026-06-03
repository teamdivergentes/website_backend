import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface StaticPage {
  path: string;
  changefreq: string;
  priority: string;
}

interface DynamicEntry {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod: string;
}

const STATIC_PAGES: StaticPage[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/boutique', changefreq: 'monthly', priority: '0.6' },
  { path: '/structure', changefreq: 'weekly', priority: '0.8' },
  { path: '/structure/equipes', changefreq: 'weekly', priority: '0.8' },
  { path: '/structure/sponsors', changefreq: 'monthly', priority: '0.6' },
  { path: '/structure/recrutement', changefreq: 'weekly', priority: '0.7' },
  { path: '/articles', changefreq: 'weekly', priority: '0.9' },
  { path: '/mentions-legales', changefreq: 'yearly', priority: '0.3' },
  { path: '/politique-de-confidentialite', changefreq: 'yearly', priority: '0.3' },
];

const TWITCH_PAGE: StaticPage = { path: '/twitch', changefreq: 'daily', priority: '0.7' };

const PALMARES_PAGE: StaticPage = {
  path: '/structure/palmares',
  changefreq: 'monthly',
  priority: '0.7',
};

@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Escape special XML characters to prevent invalid XML output.
   */
  private escapeXml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  /**
   * Format a Date to ISO 8601 date string (YYYY-MM-DD).
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Build a single <url> XML block, with an optional image:image block.
   */
  private buildUrlEntry(
    loc: string,
    changefreq: string,
    priority: string,
    lastmod?: string,
    imageBlock?: string,
  ): string {
    const lastmodLine = lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '';
    const imageSection = imageBlock ? `${imageBlock}\n` : '';
    return (
      `  <url>\n` +
      `    <loc>${this.escapeXml(loc)}</loc>\n` +
      lastmodLine +
      `    <changefreq>${changefreq}</changefreq>\n` +
      `    <priority>${priority}</priority>\n` +
      imageSection +
      `  </url>`
    );
  }

  /**
   * Build the <image:image> XML block for an article image.
   */
  private buildImageBlock(imageAbsoluteUrl: string, title: string): string {
    return (
      `    <image:image>\n` +
      `      <image:loc>${this.escapeXml(imageAbsoluteUrl)}</image:loc>\n` +
      `      <image:title>${this.escapeXml(title)}</image:title>\n` +
      `    </image:image>`
    );
  }

  async generateSitemapXml(baseUrl: string): Promise<string> {
    try {
      const [teams, members, recruitmentPosts, articles, twitchConfig, palmaresConfig] =
        await Promise.all([
          this.prisma.team.findMany({
            where: { active: true },
            select: {
              slug: true,
              updatedAt: true,
            },
          }),
          this.prisma.teamMember.findMany({
            where: {
              slug: { not: null },
              team: { active: true },
            },
            select: {
              slug: true,
              updatedAt: true,
              team: {
                select: { slug: true },
              },
            },
          }),
          this.prisma.recruitmentPost.findMany({
            where: {
              active: true,
              slug: { not: null },
            },
            select: {
              slug: true,
              updatedAt: true,
            },
          }),
          this.prisma.article.findMany({
            where: {
              published: true,
            },
            select: {
              slug: true,
              title: true,
              imageUrl: true,
              updatedAt: true,
            },
          }),
          this.prisma.config.findUnique({
            where: { key: 'page_twitch_visible' },
          }),
          this.prisma.config.findUnique({
            where: { key: 'page_palmares_visible' },
          }),
        ]);

      const normalizedBase = baseUrl.replace(/\/$/, '');

      const urlEntries: string[] = [];

      // Static pages (no lastmod — better omitted than incorrect per Google guidelines)
      for (const page of STATIC_PAGES) {
        urlEntries.push(
          this.buildUrlEntry(`${normalizedBase}${page.path}`, page.changefreq, page.priority),
        );
      }

      // /twitch page — visible sauf si page_twitch_visible explicitement 'false'
      const isTwitchVisible = twitchConfig?.value !== 'false';
      if (isTwitchVisible) {
        urlEntries.push(
          this.buildUrlEntry(
            `${normalizedBase}${TWITCH_PAGE.path}`,
            TWITCH_PAGE.changefreq,
            TWITCH_PAGE.priority,
          ),
        );
      }

      // /structure/palmares — masqué par défaut, visible uniquement si page_palmares_visible === 'true'
      const isPalmaresVisible = palmaresConfig?.value === 'true';
      if (isPalmaresVisible) {
        urlEntries.push(
          this.buildUrlEntry(
            `${normalizedBase}${PALMARES_PAGE.path}`,
            PALMARES_PAGE.changefreq,
            PALMARES_PAGE.priority,
          ),
        );
      }

      // Dynamic team pages (URL uses team slug — the route param :teamId is resolved by slug)
      const teamEntries: DynamicEntry[] = teams.map((team) => ({
        loc: `${normalizedBase}/structure/equipes/${team.slug}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: this.formatDate(team.updatedAt),
      }));

      for (const entry of teamEntries) {
        urlEntries.push(
          this.buildUrlEntry(entry.loc, entry.changefreq, entry.priority, entry.lastmod),
        );
      }

      // Dynamic team member pages (only members with a slug — URL uses team slug, not id)
      const memberEntries: DynamicEntry[] = members
        .filter((m): m is typeof m & { slug: string } => m.slug !== null)
        .map((member) => ({
          loc: `${normalizedBase}/structure/equipes/${member.team.slug}/joueur/${member.slug}`,
          changefreq: 'monthly',
          priority: '0.6',
          lastmod: this.formatDate(member.updatedAt),
        }));

      for (const entry of memberEntries) {
        urlEntries.push(
          this.buildUrlEntry(entry.loc, entry.changefreq, entry.priority, entry.lastmod),
        );
      }

      // Dynamic recruitment pages (only posts with a slug)
      const recruitmentEntries: DynamicEntry[] = recruitmentPosts
        .filter((p): p is typeof p & { slug: string } => p.slug !== null)
        .map((post) => ({
          loc: `${normalizedBase}/structure/recrutement/${post.slug}`,
          changefreq: 'weekly',
          priority: '0.7',
          lastmod: this.formatDate(post.updatedAt),
        }));

      for (const entry of recruitmentEntries) {
        urlEntries.push(
          this.buildUrlEntry(entry.loc, entry.changefreq, entry.priority, entry.lastmod),
        );
      }

      // Dynamic article pages — avec bloc image:image si imageUrl present
      for (const article of articles) {
        const loc = `${normalizedBase}/articles/${article.slug}`;
        const lastmod = this.formatDate(article.updatedAt);

        let imageBlock: string | undefined;
        if (article.imageUrl) {
          const imageAbsoluteUrl = article.imageUrl.startsWith('http')
            ? article.imageUrl
            : `${normalizedBase}${article.imageUrl}`;
          imageBlock = this.buildImageBlock(imageAbsoluteUrl, article.title);
        }

        urlEntries.push(this.buildUrlEntry(loc, 'weekly', '0.8', lastmod, imageBlock));
      }

      return (
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"` +
        ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
        urlEntries.join('\n') +
        `\n</urlset>`
      );
    } catch (error: unknown) {
      this.logger.error(
        'Sitemap generation failed',
        error instanceof Error ? error.message : error,
      );
      throw new BadGatewayException('Erreur lors de la génération du sitemap');
    }
  }
}
