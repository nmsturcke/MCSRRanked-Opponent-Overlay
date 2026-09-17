export const THEMES = ['dark-amber', 'neon-dusk', 'light', 'transparent', 'forest'] as const;
export type Theme = typeof THEMES[number];

export interface DisplayOptions {
  head: boolean;
  headToHead: boolean;
  wr: boolean;
  elo: boolean;
  twitch: boolean;
  theme: Theme;
}

export interface OverlayConfig extends DisplayOptions {
  user: string;
  uuid?: string;
}

export interface Player {
  uuid: string;
  nickname: string;
  eloRate: number | null;
  eloRank: number | null;
}

export interface Profile extends Player {
  winRate: number | null;
  twitch: string | null;
}

export interface LiveMatch {
  players: Player[];
  currentTime: number;
  streams: Record<string, string | null>;
}

export interface RecordStats {
  wins: number;
  draws: number;
  losses: number;
}

export interface OpponentView {
  player: Player;
  record: RecordStats | null;
  winRate: number | null;
  twitch: string | null;
}

export interface RankedApi {
  profile(identifier: string, signal: AbortSignal): Promise<Profile>;
  live(signal: AbortSignal): Promise<LiveMatch[]>;
  versus(self: string, opponent: string, signal: AbortSignal): Promise<RecordStats>;
}
