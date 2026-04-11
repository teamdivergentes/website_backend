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

@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Escape special XML characters to prevent invalid XML output.
   */
  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Format a Date to ISO 8601 date string (YYYY-MM-DD).
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Build a single <url> XML block.
   */
  private buildUrlEntry(
    loc: string,
    changefreq: string,
    priority: string,
    lastmod?: string,
  ): string {
    const lastmodLine = lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '';
    return (
      `  <url>\n` +
      `    <loc>${this.escapeXml(loc)}</loc>\n` +
      lastmodLine +
      `    <changefreq>${changefreq}</changefreq>\n` +
      `    <priority>${priority}</priority>\n` +
      `  </url>`
    );
  }

  async generateSitemapXml(baseUrl: string): Promise<string> {
    try {
      const [teams, members, recruitmentPosts, articles] = await Promise.all([
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
            updatedAt: true,
          },
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

      // Dynamic article pages
      const articleEntries: DynamicEntry[] = articles.map((article) => ({
        loc: `${normalizedBase}/articles/${article.slug}`,
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: this.formatDate(article.updatedAt),
      }));

      for (const entry of articleEntries) {
        urlEntries.push(
          this.buildUrlEntry(entry.loc, entry.changefreq, entry.priority, entry.lastmod),
        );
      }

      return (
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
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
