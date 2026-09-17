import type { DisplayOptions, OverlayConfig } from './types';
import { THEMES, type Theme } from './types';

export const DEFAULT_OPTIONS: Readonly<DisplayOptions> = Object.freeze({
  head: true, headToHead: true, wr: true, elo: true, twitch: true, theme: 'dark-amber',
});
export const TOGGLES = ['head', 'headToHead', 'wr', 'elo', 'twitch'] as const;

export function isTheme(value: string): value is Theme {
  return THEMES.some(theme => theme === value);
}

export function recommendedSize(options: DisplayOptions): { width: number; height: number } {
  // Reserve space for enabled fields even when a live profile omits them.
  const hasStats = options.elo || options.headToHead || options.wr;
  return { width: 390, height: options.twitch ? 170 : hasStats ? 140 : 76 };
}

export function normalizeUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replaceAll('-', '').toLowerCase();
  return /^[a-f0-9]{32}$/.test(normalized) ? normalized : null;
}

export function validUsername(value: string): boolean {
  return /^[a-zA-Z0-9_]{3,16}$/.test(value);
}

export function parseConfig(search: string): OverlayConfig {
  const params = new URLSearchParams(search);
  for (const key of ['v', 'uuid', 'user', 'theme', ...TOGGLES, 'headtohead']) {
    if (params.getAll(key).length > 1) throw new Error(`Repeated setting: ${key}`);
  }
  if (params.has('v') && params.get('v') !== '1') throw new Error('Unsupported URL version.');
  const user = (params.get('user') ?? '').trim();
  const uuid = params.has('uuid') ? normalizeUuid(params.get('uuid')) : undefined;
  if (uuid === null) throw new Error('Invalid player UUID.');
  if (!uuid && !validUsername(user)) throw new Error('Enter a valid Minecraft username.');
  const options = { ...DEFAULT_OPTIONS };
  for (const key of TOGGLES) {
    const raw = params.get(key) ?? (key === 'headToHead' ? params.get('headtohead') : null);
    if (raw === null) continue;
    if (raw !== 'true' && raw !== 'false') throw new Error(`Invalid setting: ${key}`);
    options[key] = raw === 'true';
  }
  if (params.has('headToHead') && params.has('headtohead') && params.get('headToHead') !== params.get('headtohead')) {
    throw new Error('Conflicting head-to-head settings.');
  }
  const theme = params.get('theme') ?? DEFAULT_OPTIONS.theme;
  if (!isTheme(theme)) throw new Error('Unsupported theme.');
  options.theme = theme;
  return { ...options, user, ...(uuid ? { uuid } : {}) };
}

export function createOverlayUrl(pageUrl: string, config: OverlayConfig): string {
  const url = new URL('opponent/', pageUrl);
  url.searchParams.set('v', '1');
  url.searchParams.set('user', config.user);
  if (config.uuid) url.searchParams.set('uuid', config.uuid);
  for (const key of TOGGLES) url.searchParams.set(key, String(config[key]));
  url.searchParams.set('theme', config.theme);
  return url.href;
}
