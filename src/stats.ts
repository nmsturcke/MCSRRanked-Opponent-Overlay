import { normalizeUuid } from './config';
import type { RecordStats } from './types';

export function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function seasonalWinRate(statistics: unknown): number | null {
  const season = object(object(statistics)?.season);
  const wins = count(object(season?.wins)?.ranked);
  const played = count(object(season?.playedMatches)?.ranked);
  if (wins === null || played === null || played === 0 || wins > played) return null;
  return 100 * wins / played;
}

export function headToHead(data: unknown, self: string, opponent: string): RecordStats {
  const ranked = object(object(object(data)?.results)?.ranked);
  const total = count(ranked?.total);
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(ranked ?? {})) {
    const uuid = normalizeUuid(key);
    if (uuid) normalized[uuid] = value;
  }
  const wins = count(normalized[self]);
  const losses = count(normalized[opponent]);
  if (total === null || wins === null || losses === null || wins + losses > total) {
    throw new Error('Invalid head-to-head response.');
  }
  return { wins, draws: total - wins - losses, losses };
}

export function twitchName(value: unknown): string | null {
  return typeof value === 'string' && /^[a-zA-Z0-9_]{1,25}$/.test(value) ? value : null;
}

export function twitchFromUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['twitch.tv', 'www.twitch.tv'].includes(url.hostname)) return null;
    if (url.username || url.password || url.port) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    return parts.length === 1 ? twitchName(parts[0]) : null;
  } catch { return null; }
}
