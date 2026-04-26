import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

export interface TwitchLiveStream {
  username: string;
  displayName: string;
  gameId: string;
  gameLabel: string;
  viewerCount: number;
  thumbnailUrl: string;
  startedAt: string;
  title: string;
}

interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TwitchStreamData {
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  viewer_count: number;
  thumbnail_url: string;
  started_at: string;
  title: string;
  type: string;
}

interface CacheEntry {
  data: TwitchLiveStream[];
  cachedAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 secondes
const STALE_CACHE_TTL_MS = 5 * 60_000; // 5 minutes pour le fallback
const TOKEN_MARGIN_MS = 60_000; // marge avant expiration token
const BATCH_SIZE = 100;

@Injectable()
export class TwitchHelixService implements OnModuleInit {
  private readonly logger = new Logger(TwitchHelixService.name);

  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  // Clé = usernames triés séparés par virgule
  private readonly liveCache = new Map<string, CacheEntry>();

  constructor() {
    this.clientId = process.env.TWITCH_CLIENT_ID;
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET;
  }

  onModuleInit() {
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        'TWITCH_CLIENT_ID ou TWITCH_CLIENT_SECRET manquants. ' +
          'Le service Twitch Helix fonctionne en mode dégradé : ' +
          'tous les streamers seront considérés hors-ligne.',
      );
    }
  }

  /**
   * Obtient et met en cache un app access token Twitch.
   */
  private async getAppAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const url = new URL('https://id.twitch.tv/oauth2/token');
    url.searchParams.set('client_id', this.clientId!);
    url.searchParams.set('client_secret', this.clientSecret!);
    url.searchParams.set('grant_type', 'client_credentials');

    const response = await fetch(url.toString(), { method: 'POST' });

    if (!response.ok) {
      throw new Error(`Echec de l'obtention du token Twitch: ${response.status}`);
    }

    const data = (await response.json()) as TwitchTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - TOKEN_MARGIN_MS;

    return this.accessToken;
  }

  /**
   * Invalide le token en cache (utilisé lors d'un 401).
   */
  private invalidateToken(): void {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  /**
   * Effectue un appel à Helix /streams avec gestion du 401 (retry une fois).
   */
  private async fetchStreams(
    usernames: string[],
    token: string,
    isRetry = false,
  ): Promise<TwitchStreamData[]> {
    const url = new URL('https://api.twitch.tv/helix/streams');
    usernames.forEach((u) => url.searchParams.append('user_login', u));
    url.searchParams.set('first', String(BATCH_SIZE));

    const response = await fetch(url.toString(), {
      headers: {
        'Client-ID': this.clientId!,
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401 && !isRetry) {
      this.invalidateToken();
      const newToken = await this.getAppAccessToken();
      return this.fetchStreams(usernames, newToken, true);
    }

    if (!response.ok) {
      throw new Error(`Erreur API Twitch Helix: ${response.status}`);
    }

    const body = (await response.json()) as { data: TwitchStreamData[] };
    return body.data;
  }

  /**
   * Récupère le statut live de plusieurs streamers Twitch.
   * Utilise un cache de 60s. Fallback sur le cache périmé jusqu'à 5 min.
   */
  async getLiveStreams(usernames: string[]): Promise<TwitchLiveStream[]> {
    if (!this.clientId || !this.clientSecret) {
      return [];
    }

    if (usernames.length === 0) {
      return [];
    }

    const cacheKey = [...usernames].sort((a, b) => a.localeCompare(b)).join(',');
    const cached = this.liveCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const token = await this.getAppAccessToken();

      // Découpe en batches de 100
      const batches: string[][] = [];
      for (let i = 0; i < usernames.length; i += BATCH_SIZE) {
        batches.push(usernames.slice(i, i + BATCH_SIZE));
      }

      const batchResults = await Promise.all(
        batches.map((batch) => this.fetchStreams(batch, token)),
      );

      const allStreams = batchResults.flat().filter((s) => s.type === 'live');

      const result: TwitchLiveStream[] = allStreams.map((s) => ({
        username: s.user_login,
        displayName: s.user_name,
        gameId: s.game_id,
        gameLabel: s.game_name,
        viewerCount: s.viewer_count,
        thumbnailUrl: s.thumbnail_url,
        startedAt: s.started_at,
        title: s.title,
      }));

      this.liveCache.set(cacheKey, { data: result, cachedAt: now });
      return result;
    } catch (error) {
      this.logger.warn(`Erreur lors de la récupération des streams Twitch: ${String(error)}`);

      // Fallback sur le cache périmé dans les 5 minutes
      if (cached && now - cached.cachedAt < STALE_CACHE_TTL_MS) {
        this.logger.warn('Utilisation du cache périmé (fallback sur erreur API Twitch).');
        return cached.data;
      }

      return [];
    }
  }
}
