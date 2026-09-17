import type { LiveMatch, OverlayConfig, Player, Profile } from '../src/types';
import { DEFAULT_OPTIONS } from '../src/config';

export const SELF = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
export const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
export const THIRD = 'cccccccccccccccccccccccccccccccc';
export const player: Player = { uuid: SELF, nickname: 'Nickyux', eloRate: 1200, eloRank: 1000 };
export const opponent: Player = { uuid: OTHER, nickname: 'Speedrunner', eloRate: 1842, eloRank: 128 };
export const profile: Profile = { ...opponent, winRate: 60, twitch: 'speedrunner' };
export const config: OverlayConfig = { ...DEFAULT_OPTIONS, user: 'Nickyux', uuid: SELF };
export const match = (other: Player = opponent, currentTime = 120_000): LiveMatch => ({
  currentTime, players: [player, other], streams: { [OTHER]: 'https://twitch.tv/speedrunner' },
});
export const apiProfile = (who: Player = opponent) => ({
  ...who,
  statistics: { season: { wins: { ranked: 6 }, loses: { ranked: 2 }, playedMatches: { ranked: 10 } } },
  connections: { twitch: { id: '12345', name: 'speedrunner' } },
});
export const apiLive = (visible = true) => ({ players: 800, liveMatches: visible ? [{
  currentTime: 120_000,
  players: [player, opponent],
  data: { [OTHER]: { liveUrl: 'https://twitch.tv/speedrunner', timeline: null } },
}] : [] });
export const apiVersus = { results: { ranked: { total: 8, [SELF]: 4, [OTHER]: 3 } } };
