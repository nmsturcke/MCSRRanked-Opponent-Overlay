import { describe, expect, it } from 'vitest';
import { createOverlayUrl, normalizeUuid, parseConfig, recommendedSize } from '../../src/config';
import { THEMES } from '../../src/types';
import { headToHead, seasonalWinRate, twitchFromUrl } from '../../src/stats';
import { apiProfile, apiVersus, config, OTHER, SELF } from '../fixtures';

describe('shareable configuration', () => {
  it('round-trips every option under a static hosting subpath', () => {
    const value = { ...config, head: false, wr: false, twitch: false };
    const url = new URL(createOverlayUrl('https://example.com/ranked/index.html', value));
    expect(url.pathname).toBe('/ranked/opponent/');
    expect(parseConfig(url.search)).toEqual(value);
  });
  it('supports the original username-only link and lowercase alias', () => {
    expect(parseConfig('?user=Nickyux&headtohead=false&head=false')).toMatchObject({ user: 'Nickyux', headToHead: false, head: false });
  });
  it.each(THEMES)('preserves the %s theme in a shareable URL', theme => {
    const url = new URL(createOverlayUrl('https://example.com/', { ...config, theme }));
    expect(parseConfig(url.search).theme).toBe(theme);
  });
  it('reserves enough Toolscreen space for enabled fields, including slim plus Twitch', () => {
    expect(recommendedSize(config)).toEqual({ width: 390, height: 170 });
    expect(recommendedSize({ ...config, twitch: false }).height).toBe(140);
    const slim = { ...config, elo: false, headToHead: false, wr: false, twitch: false };
    expect(recommendedSize(slim).height).toBe(76);
    expect(recommendedSize({ ...slim, twitch: true }).height).toBe(170);
  });
  it.each(['?user=Nickyux&head=no', '?user=Nickyux&v=2', '?uuid=bad', '?user=Nickyux&head=true&head=false', '?user=Nickyux&headToHead=true&headtohead=false', '?user=Nickyux&theme=unknown', '?user=ab'])('rejects malformed config: %s', search => {
    expect(() => parseConfig(search)).toThrow();
  });
  it('normalizes dashed UUIDs independently of name changes', () => {
    expect(normalizeUuid('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA')).toBe(SELF);
    expect(parseConfig(`?uuid=${SELF}`).uuid).toBe(SELF);
  });
});

describe('seasonal statistics', () => {
  it('counts draws in the opponent win-rate denominator', () => {
    expect(seasonalWinRate(apiProfile().statistics)).toBe(60);
  });
  it.each([{}, { season: { wins: { ranked: 0 }, playedMatches: { ranked: 0 } } }, { season: { wins: { ranked: 12 }, playedMatches: { ranked: 10 } } }])('does not invent a percentage for invalid or empty stats', stats => {
    expect(seasonalWinRate(stats)).toBeNull();
  });
  it('computes W-D-L from the configured player perspective', () => {
    expect(headToHead(apiVersus, SELF, OTHER)).toEqual({ wins: 4, draws: 1, losses: 3 });
    expect(headToHead(apiVersus, OTHER, SELF)).toEqual({ wins: 3, draws: 1, losses: 4 });
  });
  it('rejects inconsistent or missing head-to-head counts', () => {
    expect(() => headToHead({ results: { ranked: { total: 1, [SELF]: 2, [OTHER]: 1 } } }, SELF, OTHER)).toThrow();
    expect(() => headToHead({}, SELF, OTHER)).toThrow();
  });
  it('accepts only an actual Twitch channel URL', () => {
    expect(twitchFromUrl('https://www.twitch.tv/Speedrunner/')).toBe('Speedrunner');
    for (const url of ['https://twitch.tv.evil.com/name', 'javascript:alert(1)', 'https://twitch.tv/a/videos', 'https://name@twitch.tv/a']) expect(twitchFromUrl(url)).toBeNull();
  });
});
