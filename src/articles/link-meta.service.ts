import { Injectable, Logger, BadRequestException, BadGatewayException } from '@nestjs/common';
import * as dns from 'node:dns';

export interface LinkMetaResult {
  title?: string;
  description?: string;
  image?: { url: string };
}

export interface LinkMetaResponse {
  success: 0 | 1;
  meta?: LinkMetaResult;
}

// Plages d'IP privées et locales à bloquer (protection SSRF).
// Utilisées pour valider tant le hostname brut que l'IP résolue par DNS.
const PRIVATE_IP_PATTERNS = [
  // IPv4 loopback (127.0.0.0/8)
  /^127\./,
  // IPv4 RFC1918
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  // IPv4 link-local et metadata cloud AWS/GCP (169.254.0.0/16)
  /^169\.254\./,
  // IPv4 this-network
  /^0\./,
  // Hostnames réservés
  /^localhost$/i,
  // IPv6 loopback
  /^::1$/,
  // IPv6 link-local (fe80::/10)
  /^fe80:/i,
  // IPv6 ULA (fc00::/7) — couvre fc00::/8 ET fd00::/8 (ALPHA-SEC-002)
  /^f[cd][0-9a-f]{2}:/i,
];

/**
 * Extrait la partie IPv4 d'une adresse IPv4-mapped IPv6 (::ffff:x.x.x.x).
 * Retourne null si l'adresse n'est pas au format IPv4-mapped.
 * ALPHA-SEC-002 : ::ffff:169.254.169.254 → '169.254.169.254'
 */
function extractIpv4MappedAddress(ip: string): string | null {
  const lower = ip.toLowerCase();
  // Format ::ffff:x.x.x.x
  const ffff = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (ffff) return ffff[1];
  // Format ::ffff:hhhh:hhhh (hex compacté) — ex. ::ffff:7f00:0001 = 127.0.0.1
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower);
  if (hex) {
    const hi = Number.parseInt(hex[1], 16);
    const lo = Number.parseInt(hex[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return null;
}

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
   * Vérifie qu'une IP résolue (après lookup DNS) n'appartient pas à une plage privée.
   * Gère IPv4, IPv6 natif, et IPv4-mapped IPv6 (::ffff:x.x.x.x) — ALPHA-SEC-002.
   */
  private isPrivateIp(ip: string): boolean {
    const normalized = ip.toLowerCase();

    // Test direct sur l'adresse (couvre IPv4 et IPv6 natif)
    if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(normalized))) {
      return true;
    }

    // ALPHA-SEC-002 : démasquer les IPv4-mapped ::ffff:x.x.x.x et retester
    const ipv4Part = extractIpv4MappedAddress(normalized);
    if (ipv4Part !== null) {
      return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ipv4Part));
    }

    return false;
  }

  /**
   * Valide l'URL et résout le DNS pour vérifier que l'IP cible est publique.
   * Combine la validation syntaxique (validateUrl) et la résolution DNS (SEC-003 SSRF).
   */
  async validateUrlWithDns(rawUrl: string): Promise<URL> {
    const parsed = this.validateUrl(rawUrl);

    let resolvedAddress: string;
    try {
      const result = await dns.promises.lookup(parsed.hostname);
      resolvedAddress = result.address;
    } catch {
      throw new BadRequestException("Impossible de résoudre le nom d'hôte de l'URL fournie");
    }

    if (this.isPrivateIp(resolvedAddress)) {
      throw new BadRequestException("L'URL pointe vers une adresse privée ou locale non autorisée");
    }

    return parsed;
  }

  /**
   * Effectue une requête GET sans suivre les redirections automatiquement.
   * Utilisé par fetchHtml pour gérer les redirections avec revalidation SSRF.
   */
  private async fetchOnce(url: URL, signal: AbortSignal): Promise<globalThis.Response> {
    return fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      signal,
      // ALPHA-SEC-001 : ne pas suivre les redirections automatiquement —
      // chaque Location doit être revalidée via validateUrlWithDns avant le prochain fetch.
      redirect: 'manual',
    });
  }

  /**
   * Lit le body d'une réponse HTML avec limite de taille.
   */
  private async readBody(response: globalThis.Response): Promise<string> {
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new BadRequestException('La ressource distante ne semble pas être une page HTML');
    }

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
      combined.set(chunk.slice(0, remaining), offset);
      offset += Math.min(chunk.length, remaining);
    }

    return new TextDecoder('utf-8').decode(combined);
  }

  /**
   * Récupère le HTML de l'URL avec timeout, limite de taille et gestion manuelle
   * des redirections. Chaque URL de redirection est revalidée via validateUrlWithDns
   * pour bloquer les attaques SSRF par rebinding (ALPHA-SEC-001).
   * Maximum MAX_REDIRECTS redirections consécutives.
   */
  async fetchHtml(url: URL): Promise<string> {
    const MAX_REDIRECTS = 3;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let currentUrl = url;
    let redirectCount = 0;

    try {
      while (true) {
        const response = await this.fetchOnce(currentUrl, controller.signal);

        // Redirection manuelle : revalider la cible avant de suivre
        const isRedirect = response.status >= 300 && response.status < 400;
        if (isRedirect) {
          if (redirectCount >= MAX_REDIRECTS) {
            throw new BadGatewayException(
              `Trop de redirections (max ${MAX_REDIRECTS}) pour cette URL`,
            );
          }

          const location = response.headers.get('location');
          if (!location) {
            throw new BadGatewayException('Redirection sans header Location');
          }

          // Résoudre l'URL relative en absolue par rapport à l'URL courante
          let redirectUrl: URL;
          try {
            redirectUrl = new URL(location, currentUrl.toString());
          } catch {
            throw new BadRequestException("L'URL de redirection est malformée");
          }

          // ALPHA-SEC-001 : revalider la cible de redirection (syntaxe + DNS)
          currentUrl = await this.validateUrlWithDns(redirectUrl.toString());
          redirectCount++;
          continue;
        }

        if (!response.ok) {
          throw new BadGatewayException(`La page distante a retourné le statut ${response.status}`);
        }

        return this.readBody(response);
      }
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
   * SEC-003 : utilise validateUrlWithDns pour bloquer les attaques SSRF via DNS rebinding.
   */
  async fetchLinkMeta(rawUrl: string): Promise<LinkMetaResponse> {
    let validatedUrl: URL;
    try {
      validatedUrl = await this.validateUrlWithDns(rawUrl);
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
