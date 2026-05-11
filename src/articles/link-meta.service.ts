import { Injectable, Logger, BadRequestException, BadGatewayException } from '@nestjs/common';

export interface LinkMetaResult {
  title?: string;
  description?: string;
  image?: { url: string };
}

export interface LinkMetaResponse {
  success: 0 | 1;
  meta?: LinkMetaResult;
}

// Plages d'IP privées et locales à bloquer (protection SSRF)
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^0\./,
  /^localhost$/i,
];

const FETCH_TIMEOUT_MS = 5000;
const MAX_BODY_BYTES = 500 * 1024; // 500 KB
const USER_AGENT = 'DVGBot/1.0 (+https://teamdivergentes.fr)';

@Injectable()
export class LinkMetaService {
  private readonly logger = new Logger(LinkMetaService.name);

  /**
   * Valide que l'URL n'est pas une adresse privée ou locale (protection SSRF).
   */
  validateUrl(rawUrl: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException("L'URL fournie est malformée");
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException("L'URL doit utiliser le protocole HTTP ou HTTPS");
    }

    const hostname = parsed.hostname.toLowerCase();

    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        throw new BadRequestException(
          "L'URL pointe vers une adresse privée ou locale non autorisée",
        );
      }
    }

    // Bloquer les ports non standards (sauf 80 et 443)
    const port = parsed.port;
    if (port && port !== '80' && port !== '443') {
      throw new BadRequestException('Les ports non standards ne sont pas autorisés');
    }

    return parsed;
  }

  /**
   * Récupère le HTML de l'URL avec timeout et limite de taille.
   */
  async fetchHtml(url: URL): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new BadGatewayException(`La page distante a retourné le statut ${response.status}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        throw new BadRequestException('La ressource distante ne semble pas être une page HTML');
      }

      // Lire le body avec limite de taille
      const reader = response.body?.getReader();
      if (!reader) {
        throw new BadGatewayException('Impossible de lire la réponse de la page distante');
      }

      let totalBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.length;
        if (totalBytes > MAX_BODY_BYTES) {
          reader.cancel().catch(() => {});
          break;
        }
        chunks.push(value);
      }

      const safeLength = Math.min(totalBytes, MAX_BODY_BYTES);
      const combined = new Uint8Array(safeLength);
      let offset = 0;
      for (const chunk of chunks) {
        const remaining = safeLength - offset;
        if (remaining <= 0) break;
        const slice = chunk.slice(0, remaining);
        combined.set(slice, offset);
        offset += slice.length;
      }

      return new TextDecoder('utf-8').decode(combined);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Extrait la valeur d'un attribut content d'une balise meta.
   * Priorité : propriété OpenGraph > name standard.
   */
  extractMetaContent(html: string, property: string, name: string): string | undefined {
    const ogPattern = new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']{0,2000})["'][^>]*>`,
      'i',
    );
    const ogPatternReverse = new RegExp(
      `<meta[^>]+content=["']([^"']{0,2000})["'][^>]+property=["']${property}["'][^>]*>`,
      'i',
    );

    const stdPattern = new RegExp(
      `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']{0,2000})["'][^>]*>`,
      'i',
    );
    const stdPatternReverse = new RegExp(
      `<meta[^>]+content=["']([^"']{0,2000})["'][^>]+name=["']${name}["'][^>]*>`,
      'i',
    );

    const ogMatch = ogPattern.exec(html) ?? ogPatternReverse.exec(html);
    if (ogMatch?.[1]) return this.decodeHtmlEntities(ogMatch[1].trim());

    const stdMatch = stdPattern.exec(html) ?? stdPatternReverse.exec(html);
    if (stdMatch?.[1]) return this.decodeHtmlEntities(stdMatch[1].trim());

    return undefined;
  }

  /**
   * Extrait le contenu de la balise <title>.
   */
  extractTitle(html: string): string | undefined {
    const match = /<title[^>]*>([^<]{0,2000})<\/title>/i.exec(html);
    if (match?.[1]) return this.decodeHtmlEntities(match[1].trim());
    return undefined;
  }

  /**
   * Décode les entités HTML basiques.
   */
  decodeHtmlEntities(str: string): string {
    return str
      .replaceAll(/&amp;/gi, '&')
      .replaceAll(/&lt;/gi, '<')
      .replaceAll(/&gt;/gi, '>')
      .replaceAll(/&quot;/gi, '"')
      .replaceAll(/&#39;/gi, "'")
      .replaceAll(/&nbsp;/gi, ' ')
      .replaceAll(/&#(\d+);/g, (_, code: string) =>
        String.fromCodePoint(Number.parseInt(code, 10)),
      );
  }

  /**
   * Valide qu'une image URL est bien une URL HTTP/HTTPS absolue.
   */
  isValidImageUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Point d'entrée principal : récupère les métadonnées d'une URL.
   */
  async fetchLinkMeta(rawUrl: string): Promise<LinkMetaResponse> {
    let validatedUrl: URL;
    try {
      validatedUrl = this.validateUrl(rawUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'URL invalide';
      this.logger.warn(`URL rejetée (validation SSRF) : ${message}`);
      throw error;
    }

    let html: string;
    try {
      html = await this.fetchHtml(validatedUrl);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof BadGatewayException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.warn(`Échec du fetch de ${validatedUrl.hostname} : ${message}`);
      return { success: 0 };
    }

    const ogTitle = this.extractMetaContent(html, 'og:title', 'og:title');
    const titleTag = this.extractTitle(html);
    const title = ogTitle ?? titleTag;

    const description = this.extractMetaContent(html, 'og:description', 'description');

    const ogImage = this.extractMetaContent(html, 'og:image', 'og:image');
    const image = ogImage && this.isValidImageUrl(ogImage) ? { url: ogImage } : undefined;

    const meta: LinkMetaResult = {};
    if (title) meta.title = title.substring(0, 500);
    if (description) meta.description = description.substring(0, 1000);
    if (image) meta.image = image;

    return { success: 1, meta };
  }
}
