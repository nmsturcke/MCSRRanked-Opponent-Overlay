import { normalizeUuid } from './config';
import { count, headToHead, object, seasonalWinRate, twitchName } from './stats';
import type { LiveMatch, Player, Profile, RankedApi, RecordStats } from './types';

export const API_BASE = 'https://api.mcsrranked.com';
export const REQUEST_TIMEOUT = 8_000;

export class ApiError extends Error {
  constructor(message: string, public readonly status = 0, public readonly retryAfterMs = 0, public readonly notFound = false) {
    super(message);
    this.name = 'ApiError';
  }
}

export function parsePlayer(value: unknown): Player {
  const raw = object(value);
  const uuid = normalizeUuid(raw?.uuid);
  if (!uuid || typeof raw?.nickname !== 'string' || !raw.nickname.trim() || raw.nickname.length > 64) {
    throw new ApiError('Invalid player response.');
  }
  const rank = count(raw.eloRank);
  return { uuid, nickname: raw.nickname, eloRate: count(raw.eloRate), eloRank: rank && rank > 0 ? rank : null };
}

export function parseLive(value: unknown): LiveMatch[] {
  const matches = object(value)?.liveMatches;
  if (!Array.isArray(matches)) throw new ApiError('Invalid live-match response.');
  return matches.map((value: unknown) => {
    const raw = object(value);
    const time = count(raw?.currentTime);
    if (!Array.isArray(raw?.players) || time === null) throw new ApiError('Invalid live match.');
    const streams: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(object(raw.data) ?? {})) {
      const uuid = normalizeUuid(key);
      const url = object(value)?.liveUrl;
      if (uuid) streams[uuid] = typeof url === 'string' ? url : null;
    }
    return { players: raw.players.map(parsePlayer), currentTime: time, streams };
  });
}

function retryDelay(value: string | null): number {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

export class HttpRankedApi implements RankedApi {
  constructor(private readonly fetcher: typeof fetch = fetch.bind(globalThis)) {}

  private async request(path: string, signal: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal.aborted) controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, REQUEST_TIMEOUT);
    try {
      const response = await this.fetcher(`${API_BASE}${path}`, {
        signal: controller.signal, cache: 'no-store', credentials: 'omit',
      });
      const retry = retryDelay(response.headers.get('Retry-After'));
      if (response.status === 429) throw new ApiError('Too many requests. Retrying later.', 429, retry || 60_000);
      let body: Record<string, unknown> | null;
      try { body = object(await response.json()); }
      catch { throw new ApiError('The API returned an unreadable response.', response.status, retry); }
      if (!response.ok || body?.status !== 'success') {
        throw new ApiError('The API could not return this data.', response.status, retry,
          response.status === 400 && body?.status === 'error' && body.data === null);
      }
      if (!('data' in body)) throw new ApiError('The API returned an incomplete response.');
      return body.data;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    }
  }

  async profile(identifier: string, signal: AbortSignal): Promise<Profile> {
    const data = await this.request(`/users/${encodeURIComponent(identifier)}`, signal);
    const raw = object(data);
    const twitch = object(object(raw?.connections)?.twitch);
    return { ...parsePlayer(data), winRate: seasonalWinRate(raw?.statistics), twitch: twitchName(twitch?.name) };
  }

  async live(signal: AbortSignal): Promise<LiveMatch[]> {
    return parseLive(await this.request('/live', signal));
  }

  async versus(self: string, opponent: string, signal: AbortSignal): Promise<RecordStats> {
    try {
      return headToHead(await this.request(`/users/${self}/versus/${opponent}`, signal), self, opponent);
    } catch (error) {
      if (error instanceof ApiError && error.notFound) return { wins: 0, draws: 0, losses: 0 };
      throw error;
    }
  }
}
