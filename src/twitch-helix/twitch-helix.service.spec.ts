import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { TwitchHelixService, TwitchLiveStream } from './twitch-helix.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

/** Construit un mock de réponse fetch réussie */
function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  };
}

/** Construit un mock de réponse fetch en erreur */
function errorResponse(status: number) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: 'Error' }),
  };
}

const tokenResponse = (token = 'test-token', expiresIn = 3600) =>
  okResponse({ access_token: token, expires_in: expiresIn, token_type: 'bearer' });

const streamsResponse = (streams: unknown[] = []) => okResponse({ data: streams });

const liveStream = (username = 'streamer1') => ({
  user_login: username,
  user_name: username.charAt(0).toUpperCase() + username.slice(1),
  game_id: '516575',
  game_name: 'Valorant',
  viewer_count: 500,
  thumbnail_url: 'https://thumb.url/{width}x{height}.jpg',
  started_at: '2024-01-01T12:00:00Z',
  title: 'Playing ranked!',
  type: 'live',
});

describe('TwitchHelixService', () => {
  let service: TwitchHelixService;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers();

    process.env = {
      ...originalEnv,
      TWITCH_CLIENT_ID: 'test-client-id',
      TWITCH_CLIENT_SECRET: 'test-client-secret',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TwitchHelixService],
    }).compile();

    service = module.get<TwitchHelixService>(TwitchHelixService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  // ─── Token acquisition ──────────────────────────────────────────────────────

  describe('token acquisition', () => {
    it('should obtain an app access token on first call', async () => {
      mockFetch.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(streamsResponse());

      await service.getLiveStreams(['user1']);

      const calls = mockFetch.mock.calls as [string, unknown][];
      expect(calls[0][0]).toContain('oauth2/token');
      expect(calls[0][1]).toEqual(expect.objectContaining({ method: 'POST' }));
    });

    it('should cache the token and not re-fetch on subsequent calls within expiry', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse('cached-token'))
        .mockResolvedValue(streamsResponse());

      await service.getLiveStreams(['user1']);
      await service.getLiveStreams(['user2']);

      const tokenCalls = (mockFetch.mock.calls as [string][]).filter((call) =>
        call[0].includes('oauth2/token'),
      );
      expect(tokenCalls).toHaveLength(1);
    });

    it('should refresh token when expired', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse('first-token', 60))
        .mockResolvedValueOnce(streamsResponse())
        .mockResolvedValueOnce(tokenResponse('refreshed-token'))
        .mockResolvedValueOnce(streamsResponse());

      await service.getLiveStreams(['user1']);
      // Advance time past token expiry (60s - 60s margin = 0, so already expired)
      jest.advanceTimersByTime(120 * 1000);
      await service.getLiveStreams(['user2']);

      const tokenCalls = (mockFetch.mock.calls as [string][]).filter((call) =>
        call[0].includes('oauth2/token'),
      );
      expect(tokenCalls).toHaveLength(2);
    });

    it('should retry (refresh token) on 401 response', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse('stale-token'))
        .mockResolvedValueOnce(errorResponse(401))
        .mockResolvedValueOnce(tokenResponse('new-token'))
        .mockResolvedValueOnce(streamsResponse());

      const result = await service.getLiveStreams(['user1']);
      expect(result).toEqual([]);

      const tokenCalls = (mockFetch.mock.calls as [string][]).filter((call) =>
        call[0].includes('oauth2/token'),
      );
      expect(tokenCalls).toHaveLength(2);
    });
  });

  // ─── getLiveStreams ──────────────────────────────────────────────────────────

  describe('getLiveStreams', () => {
    it('should return live streams data correctly', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(streamsResponse([liveStream('streamer1')]));

      const result = await service.getLiveStreams(['streamer1']);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject<Partial<TwitchLiveStream>>({
        username: 'streamer1',
        displayName: 'Streamer1',
        gameId: '516575',
        gameLabel: 'Valorant',
        viewerCount: 500,
        title: 'Playing ranked!',
      });
    });

    it('should return empty array when no streams are live', async () => {
      mockFetch.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(streamsResponse());

      const result = await service.getLiveStreams(['offline_user']);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty input', async () => {
      const result = await service.getLiveStreams([]);
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should batch requests when more than 100 usernames provided', async () => {
      const usernames = Array.from({ length: 150 }, (_, i) => `user${i}`);

      mockFetch.mockResolvedValueOnce(tokenResponse()).mockResolvedValue(streamsResponse());

      await service.getLiveStreams(usernames);

      const streamCalls = (mockFetch.mock.calls as [string][]).filter((call) =>
        call[0].includes('/helix/streams'),
      );
      // 150 usernames → 2 batches (100 + 50)
      expect(streamCalls).toHaveLength(2);
    });
  });

  // ─── Cache ──────────────────────────────────────────────────────────────────

  describe('cache', () => {
    it('should cache results for 60 seconds (same key = sorted usernames)', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValue(streamsResponse([liveStream('user1')]));

      const result1 = await service.getLiveStreams(['user1']);
      const result2 = await service.getLiveStreams(['user1']);

      const streamCalls = (mockFetch.mock.calls as [string][]).filter((call) =>
        call[0].includes('/helix/streams'),
      );
      expect(streamCalls).toHaveLength(1);
      expect(result1).toEqual(result2);
    });

    it('should invalidate cache after 60 seconds', async () => {
      mockFetch.mockResolvedValueOnce(tokenResponse()).mockResolvedValue(streamsResponse());

      await service.getLiveStreams(['user1']);
      jest.advanceTimersByTime(61 * 1000);
      await service.getLiveStreams(['user1']);

      const streamCalls = (mockFetch.mock.calls as [string][]).filter((call) =>
        call[0].includes('/helix/streams'),
      );
      expect(streamCalls).toHaveLength(2);
    });

    it('should use sorted usernames as cache key', async () => {
      mockFetch.mockResolvedValueOnce(tokenResponse()).mockResolvedValue(streamsResponse());

      await service.getLiveStreams(['user2', 'user1']);
      await service.getLiveStreams(['user1', 'user2']); // same set, different order

      const streamCalls = (mockFetch.mock.calls as [string][]).filter((call) =>
        call[0].includes('/helix/streams'),
      );
      // Same cache key → only 1 fetch
      expect(streamCalls).toHaveLength(1);
    });

    it('should return last valid cache on API error for up to 5 minutes', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(streamsResponse([liveStream('user1')]))
        .mockRejectedValueOnce(new Error('Network error'));

      const firstResult = await service.getLiveStreams(['user1']);
      expect(firstResult).toHaveLength(1);

      jest.advanceTimersByTime(61 * 1000);
      const secondResult = await service.getLiveStreams(['user1']);
      expect(secondResult).toHaveLength(1);
      expect(secondResult[0].username).toBe('user1');
    });

    it('should return empty array when stale cache > 5 minutes and API still fails', async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(streamsResponse([liveStream('user1')]))
        .mockRejectedValue(new Error('Sustained network error'));

      await service.getLiveStreams(['user1']);
      jest.advanceTimersByTime(6 * 60 * 1000);

      const result = await service.getLiveStreams(['user1']);
      expect(result).toEqual([]);
    });
  });

  // ─── Mode dégradé (env vars manquantes) ────────────────────────────────────

  describe('degraded mode (missing env vars)', () => {
    it('should log warning and return empty array when TWITCH_CLIENT_ID is missing', async () => {
      delete process.env.TWITCH_CLIENT_ID;
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      const degradedModule: TestingModule = await Test.createTestingModule({
        providers: [TwitchHelixService],
      }).compile();

      const degradedService = degradedModule.get<TwitchHelixService>(TwitchHelixService);
      const result = await degradedService.getLiveStreams(['user1']);

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return empty array when TWITCH_CLIENT_SECRET is missing', async () => {
      delete process.env.TWITCH_CLIENT_SECRET;
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      const degradedModule: TestingModule = await Test.createTestingModule({
        providers: [TwitchHelixService],
      }).compile();

      const degradedService = degradedModule.get<TwitchHelixService>(TwitchHelixService);
      const result = await degradedService.getLiveStreams(['user1']);

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
