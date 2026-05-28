import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, BadGatewayException } from '@nestjs/common';
import * as dns from 'dns';
import { LinkMetaService } from './link-meta.service';

// Helper pour construire une Response mockée
function mockFetchResponse(
  html: string,
  status = 200,
  contentType = 'text/html; charset=utf-8',
): Response {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(html);
  let pos = 0;

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pos < encoded.length) {
        controller.enqueue(encoded.slice(pos));
        pos = encoded.length;
      } else {
        controller.close();
      }
    },
  });

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': contentType }),
    body: stream,
  } as unknown as Response;
}

describe('LinkMetaService', () => {
  let service: LinkMetaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LinkMetaService],
    }).compile();

    service = module.get<LinkMetaService>(LinkMetaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // validateUrl
  // -------------------------------------------------------------------------
  describe('validateUrl', () => {
    it('accepte une URL HTTPS valide', () => {
      expect(() => service.validateUrl('https://example.com')).not.toThrow();
    });

    it('accepte une URL HTTP valide', () => {
      expect(() => service.validateUrl('http://example.com')).not.toThrow();
    });

    it('rejette une URL malformée', () => {
      expect(() => service.validateUrl('pas-une-url')).toThrow(BadRequestException);
    });

    it('rejette le protocole ftp', () => {
      expect(() => service.validateUrl('ftp://example.com/file')).toThrow(BadRequestException);
    });

    it('rejette localhost', () => {
      expect(() => service.validateUrl('http://localhost/path')).toThrow(BadRequestException);
    });

    it('rejette 127.0.0.1', () => {
      expect(() => service.validateUrl('http://127.0.0.1')).toThrow(BadRequestException);
    });

    it('rejette 10.x.x.x', () => {
      expect(() => service.validateUrl('http://10.0.0.1')).toThrow(BadRequestException);
    });

    it('rejette 192.168.x.x', () => {
      expect(() => service.validateUrl('http://192.168.1.1')).toThrow(BadRequestException);
    });

    it('rejette 172.16.x.x', () => {
      expect(() => service.validateUrl('http://172.16.0.1')).toThrow(BadRequestException);
    });

    it('rejette 172.31.x.x', () => {
      expect(() => service.validateUrl('http://172.31.255.255')).toThrow(BadRequestException);
    });

    it('accepte 172.15.x.x (hors plage privée)', () => {
      expect(() => service.validateUrl('http://172.15.0.1')).not.toThrow();
    });

    it('rejette les ports non standards', () => {
      expect(() => service.validateUrl('http://example.com:8080')).toThrow(BadRequestException);
    });

    it('accepte le port 80 explicite', () => {
      expect(() => service.validateUrl('http://example.com:80/path')).not.toThrow();
    });

    it('accepte le port 443 explicite', () => {
      expect(() => service.validateUrl('https://example.com:443/path')).not.toThrow();
    });

    it('retourne un objet URL valide', () => {
      const result = service.validateUrl('https://example.com/path?q=1');
      expect(result).toBeInstanceOf(URL);
      expect(result.hostname).toBe('example.com');
    });
  });

  // -------------------------------------------------------------------------
  // decodeHtmlEntities
  // -------------------------------------------------------------------------
  describe('decodeHtmlEntities', () => {
    it('décode &amp;', () => {
      expect(service.decodeHtmlEntities('a &amp; b')).toBe('a & b');
    });

    it('décode &lt; et &gt;', () => {
      expect(service.decodeHtmlEntities('&lt;div&gt;')).toBe('<div>');
    });

    it('décode &quot;', () => {
      expect(service.decodeHtmlEntities('&quot;texte&quot;')).toBe('"texte"');
    });

    it('décode &#39;', () => {
      expect(service.decodeHtmlEntities('l&#39;exemple')).toBe("l'exemple");
    });

    it('décode &#code;', () => {
      expect(service.decodeHtmlEntities('&#65;')).toBe('A');
    });

    it('laisse passer un texte sans entités', () => {
      expect(service.decodeHtmlEntities('Bonjour monde')).toBe('Bonjour monde');
    });
  });

  // -------------------------------------------------------------------------
  // extractTitle
  // -------------------------------------------------------------------------
  describe('extractTitle', () => {
    it('extrait le contenu de <title>', () => {
      const html = '<html><head><title>Mon titre</title></head></html>';
      expect(service.extractTitle(html)).toBe('Mon titre');
    });

    it('décode les entités HTML dans le titre', () => {
      const html = '<title>Titre &amp; Suite</title>';
      expect(service.extractTitle(html)).toBe('Titre & Suite');
    });

    it('retourne undefined si pas de balise title', () => {
      const html = '<html><head></head></html>';
      expect(service.extractTitle(html)).toBeUndefined();
    });

    it('gère la casse (TITLE)', () => {
      const html = '<TITLE>Titre majuscule</TITLE>';
      expect(service.extractTitle(html)).toBe('Titre majuscule');
    });
  });

  // -------------------------------------------------------------------------
  // extractMetaContent
  // -------------------------------------------------------------------------
  describe('extractMetaContent', () => {
    it('extrait og:title (property avant content)', () => {
      const html = '<meta property="og:title" content="OG Title">';
      expect(service.extractMetaContent(html, 'og:title', 'og:title')).toBe('OG Title');
    });

    it('extrait og:title (content avant property)', () => {
      const html = '<meta content="OG Title" property="og:title">';
      expect(service.extractMetaContent(html, 'og:title', 'og:title')).toBe('OG Title');
    });

    it('extrait la description standard (name)', () => {
      const html = '<meta name="description" content="Ma description">';
      expect(service.extractMetaContent(html, 'og:description', 'description')).toBe(
        'Ma description',
      );
    });

    it('privilégie OpenGraph sur la description standard', () => {
      const html = `
        <meta property="og:description" content="OG Desc">
        <meta name="description" content="Standard Desc">
      `;
      expect(service.extractMetaContent(html, 'og:description', 'description')).toBe('OG Desc');
    });

    it('retourne undefined si aucune meta trouvée', () => {
      const html = '<html><body>Rien</body></html>';
      expect(service.extractMetaContent(html, 'og:title', 'og:title')).toBeUndefined();
    });

    it('décode les entités HTML', () => {
      const html = '<meta property="og:title" content="Titre &amp; Test">';
      expect(service.extractMetaContent(html, 'og:title', 'og:title')).toBe('Titre & Test');
    });
  });

  // -------------------------------------------------------------------------
  // isValidImageUrl
  // -------------------------------------------------------------------------
  describe('isValidImageUrl', () => {
    it("accepte une URL HTTPS d'image", () => {
      expect(service.isValidImageUrl('https://cdn.example.com/img.png')).toBe(true);
    });

    it("accepte une URL HTTP d'image", () => {
      expect(service.isValidImageUrl('http://cdn.example.com/img.jpg')).toBe(true);
    });

    it('rejette un chemin relatif', () => {
      expect(service.isValidImageUrl('/images/photo.jpg')).toBe(false);
    });

    it('rejette une chaîne vide', () => {
      expect(service.isValidImageUrl('')).toBe(false);
    });

    it('rejette une URL ftp', () => {
      expect(service.isValidImageUrl('ftp://example.com/img.png')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // fetchLinkMeta (intégration avec fetch mocké)
  // -------------------------------------------------------------------------
  describe('fetchLinkMeta', () => {
    it('retourne success:0 si URL pointe vers une adresse privée', async () => {
      await expect(service.fetchLinkMeta('http://localhost')).rejects.toThrow(BadRequestException);
    });

    it('retourne success:0 si fetch échoue avec une erreur réseau', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      const result = await service.fetchLinkMeta('https://example.com');
      expect(result.success).toBe(0);
    });

    it('remonte BadGatewayException si le serveur retourne 404', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse('', 404, 'text/html'));
      await expect(service.fetchLinkMeta('https://example.com')).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('retourne success:1 avec les métadonnées OpenGraph', async () => {
      const html = `
        <html>
          <head>
            <title>Titre fallback</title>
            <meta property="og:title" content="OG Title Test">
            <meta property="og:description" content="OG Description Test">
            <meta property="og:image" content="https://cdn.example.com/image.jpg">
          </head>
        </html>
      `;
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(html));

      const result = await service.fetchLinkMeta('https://example.com');

      expect(result.success).toBe(1);
      expect(result.meta?.title).toBe('OG Title Test');
      expect(result.meta?.description).toBe('OG Description Test');
      expect(result.meta?.image?.url).toBe('https://cdn.example.com/image.jpg');
    });

    it('utilise <title> comme fallback si og:title absent', async () => {
      const html = `
        <html>
          <head>
            <title>Titre depuis balise title</title>
            <meta name="description" content="Ma description standard">
          </head>
        </html>
      `;
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(html));

      const result = await service.fetchLinkMeta('https://example.com');

      expect(result.success).toBe(1);
      expect(result.meta?.title).toBe('Titre depuis balise title');
      expect(result.meta?.description).toBe('Ma description standard');
      expect(result.meta?.image).toBeUndefined();
    });

    it("n'inclut pas d'image si og:image est une URL relative", async () => {
      const html = `
        <html>
          <head>
            <title>Titre</title>
            <meta property="og:image" content="/images/local.jpg">
          </head>
        </html>
      `;
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(html));

      const result = await service.fetchLinkMeta('https://example.com');

      expect(result.success).toBe(1);
      expect(result.meta?.image).toBeUndefined();
    });

    it('remonte BadRequestException si content-type non HTML', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(mockFetchResponse('{}', 200, 'application/json'));

      await expect(service.fetchLinkMeta('https://example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('tronque le titre à 500 caractères', async () => {
      const longTitle = 'A'.repeat(600);
      const html = `<html><head><title>${longTitle}</title></head></html>`;
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(html));

      const result = await service.fetchLinkMeta('https://example.com');

      expect(result.success).toBe(1);
      expect(result.meta?.title?.length).toBe(500);
    });

    it('retourne success:1 avec meta vide si aucune méta trouvée', async () => {
      const html = '<html><body>Contenu sans métas</body></html>';
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(html));

      const result = await service.fetchLinkMeta('https://example.com');

      expect(result.success).toBe(1);
      expect(result.meta).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // SEC-003 — Protection SSRF via résolution DNS
  // -------------------------------------------------------------------------
  describe('validateUrlWithDns — SEC-003 SSRF DNS resolution', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('rejette une URL dont le DNS résout vers 127.0.0.1 (loopback)', async () => {
      jest.spyOn(dns.promises, 'lookup').mockResolvedValueOnce({
        address: '127.0.0.1',
        family: 4,
      });

      await expect(service.validateUrlWithDns('https://evil.example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejette une URL dont le DNS résout vers 169.254.169.254 (metadata cloud)', async () => {
      jest.spyOn(dns.promises, 'lookup').mockResolvedValueOnce({
        address: '169.254.169.254',
        family: 4,
      });

      await expect(service.validateUrlWithDns('https://evil.example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejette une URL dont le DNS résout vers 10.0.0.1 (RFC1918)', async () => {
      jest.spyOn(dns.promises, 'lookup').mockResolvedValueOnce({
        address: '10.0.0.1',
        family: 4,
      });

      await expect(service.validateUrlWithDns('https://evil.example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejette une URL dont le DNS résout vers 192.168.1.1 (RFC1918)', async () => {
      jest.spyOn(dns.promises, 'lookup').mockResolvedValueOnce({
        address: '192.168.1.1',
        family: 4,
      });

      await expect(service.validateUrlWithDns('https://attacker.example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejette une URL dont le DNS résout vers 172.16.0.1 (RFC1918)', async () => {
      jest.spyOn(dns.promises, 'lookup').mockResolvedValueOnce({
        address: '172.16.0.1',
        family: 4,
      });

      await expect(service.validateUrlWithDns('https://attacker.example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejette une URL dont le DNS résout vers ::1 (IPv6 loopback)', async () => {
      jest.spyOn(dns.promises, 'lookup').mockResolvedValueOnce({
        address: '::1',
        family: 6,
      });

      await expect(service.validateUrlWithDns('https://evil.example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('accepte une URL dont le DNS résout vers une IP publique', async () => {
      jest.spyOn(dns.promises, 'lookup').mockResolvedValueOnce({
        address: '93.184.216.34',
        family: 4,
      });

      const result = await service.validateUrlWithDns('https://example.com');
      expect(result).toBeInstanceOf(URL);
      expect(result.hostname).toBe('example.com');
    });

    it('lève BadRequestException si la résolution DNS échoue', async () => {
      const dnsError = new Error('ENOTFOUND invalid.domain.xyz');
      jest.spyOn(dns.promises, 'lookup').mockRejectedValueOnce(dnsError);

      await expect(service.validateUrlWithDns('https://invalid.domain.xyz')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // SEC-003 — fetchLinkMeta utilise bien la validation DNS
  // -------------------------------------------------------------------------
  describe('fetchLinkMeta avec DNS validation — SEC-003', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('refuse de fetcher si DNS résout vers une IP privée', async () => {
      jest.spyOn(dns.promises, 'lookup').mockResolvedValueOnce({
        address: '10.0.0.100',
        family: 4,
      });

      await expect(service.fetchLinkMeta('https://evil.example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('autorise le fetch si DNS résout vers une IP publique', async () => {
      jest.spyOn(dns.promises, 'lookup').mockResolvedValueOnce({
        address: '93.184.216.34',
        family: 4,
      });
      const html = '<html><head><title>OK</title></head></html>';
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(html));

      const result = await service.fetchLinkMeta('https://example.com');
      expect(result.success).toBe(1);
    });
  });
});
