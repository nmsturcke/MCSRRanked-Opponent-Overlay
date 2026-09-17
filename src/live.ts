import { ApiError } from './api';
import { twitchFromUrl } from './stats';
import type { LiveMatch, OpponentView, OverlayConfig, RankedApi } from './types';

export const POLL_MS = 5_000;
export const HIDE_AFTER_FAILURES = 4; // Initial failed request + three failed retries.
export const STATS_TTL_MS = 60_000;
const MAX_BACKOFF_MS = 60_000;

export function findMatch(matches: LiveMatch[], self: string): LiveMatch | null {
  const candidates = matches.filter(match => match.players.some(player => player.uuid === self));
  const match = candidates.length === 1 ? candidates[0] : undefined;
  if (!match || match.players.length !== 2 || new Set(match.players.map(p => p.uuid)).size !== 2) return null;
  return match;
}

export function backoff(failures: number, random = Math.random): number {
  return Math.min(MAX_BACKOFF_MS, POLL_MS * 2 ** Math.min(Math.max(failures - 1, 0), 4) * (1 + random() * 0.1));
}

interface DetailTask {
  busy: boolean;
  next: number;
  failures: number;
}

/** One live loop, independent optional lookups, and a generation guard for late responses. */
export class OverlayController {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = true;
  private root = new AbortController();
  private details = new AbortController();
  private generation = 0;
  private self: string | undefined;
  private failures = 0;
  private blockedUntil = 0;
  private view: OpponentView | null = null;
  private lastTime = 0;
  private streamName: string | null = null;
  private profileTask: DetailTask = { busy: false, next: 0, failures: 0 };
  private versusTask: DetailTask = { busy: false, next: 0, failures: 0 };

  constructor(
    private readonly config: OverlayConfig,
    private readonly api: RankedApi,
    private readonly render: (view: OpponentView | null) => void,
    private readonly random = Math.random,
  ) { this.self = config.uuid; }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.root = new AbortController();
    this.clearOpponent();
    void this.poll();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    this.root.abort();
    this.clearOpponent();
  }

  private clearOpponent(): void {
    this.generation++;
    this.details.abort();
    this.details = new AbortController();
    this.view = null;
    this.lastTime = 0;
    this.streamName = null;
    this.profileTask = { busy: false, next: 0, failures: 0 };
    this.versusTask = { busy: false, next: 0, failures: 0 };
    this.render(null);
  }

  private noteRateLimit(error: unknown): void {
    if (error instanceof ApiError && error.status === 429) {
      this.blockedUntil = Math.max(this.blockedUntil, Date.now() + Math.max(error.retryAfterMs, 60_000));
      // No current identity can be verified during a prolonged server cooldown.
      this.clearOpponent();
    }
  }

  private async poll(): Promise<void> {
    if (this.stopped) return;
    const lifecycle = this.root;
    let delay = POLL_MS;
    try {
      if (Date.now() < this.blockedUntil) return;
      if (!this.self) {
        const profile = await this.api.profile(this.config.user, lifecycle.signal);
        if (this.stopped || lifecycle !== this.root) return;
        this.self = profile.uuid;
      }
      if (this.stopped || lifecycle !== this.root) return;
      const matches = await this.api.live(lifecycle.signal);
      if (this.stopped || lifecycle !== this.root) return;
      this.failures = 0;
      const match = findMatch(matches, this.self);
      const opponent = match?.players.find(player => player.uuid !== this.self);
      if (!match || !opponent) {
        this.clearOpponent();
        return;
      }
      const rematch = match.currentTime + 2_000 < this.lastTime;
      if (this.view?.player.uuid !== opponent.uuid || rematch) {
        this.clearOpponent();
        this.view = { player: opponent, record: null, winRate: null, twitch: null };
      }
      this.lastTime = match.currentTime;
      if (!this.view) return;
      this.view.player = opponent;
      this.streamName = twitchFromUrl(match.streams[opponent.uuid]);
      if (this.streamName) this.view.twitch = this.streamName;
      this.render({ ...this.view });
      if (this.config.wr || this.config.twitch) this.loadDetail('profile', this.profileTask);
      if (this.config.headToHead) this.loadDetail('versus', this.versusTask);
    } catch (error) {
      if (this.stopped || lifecycle !== this.root) return;
      this.failures++;
      if (this.failures >= HIDE_AFTER_FAILURES) this.clearOpponent();
      this.noteRateLimit(error);
      delay = Math.max(backoff(this.failures, this.random), error instanceof ApiError ? error.retryAfterMs : 0);
    } finally {
      if (!this.stopped && lifecycle === this.root) {
        this.timer = setTimeout(() => void this.poll(), Math.max(delay, this.blockedUntil - Date.now()));
      }
    }
  }

  private loadDetail(kind: 'profile' | 'versus', task: DetailTask): void {
    if (!this.view || !this.self || task.busy || Date.now() < task.next || Date.now() < this.blockedUntil) return;
    task.busy = true;
    const generation = this.generation;
    const opponent = this.view.player.uuid;
    const request = kind === 'profile'
      ? this.api.profile(opponent, this.details.signal)
      : this.api.versus(this.self, opponent, this.details.signal);
    void request.then(value => {
      if (this.stopped || generation !== this.generation || !this.view) return;
      if ('winRate' in value) {
        this.view.winRate = value.winRate;
        this.view.twitch = value.twitch ?? this.streamName;
      } else {
        this.view.record = value;
      }
      task.failures = 0;
      task.next = Date.now() + STATS_TTL_MS;
      this.render({ ...this.view });
    }).catch(error => {
      if (this.stopped || generation !== this.generation || !this.view) return;
      // Expired stats should not masquerade as fresh stats during an outage.
      if (kind === 'profile') {
        this.view.winRate = null;
        this.view.twitch = this.streamName;
      }
      else this.view.record = null;
      task.failures++;
      task.next = Date.now() + Math.max(backoff(task.failures, this.random), error instanceof ApiError ? error.retryAfterMs : 0);
      this.noteRateLimit(error);
      this.render(this.view ? { ...this.view } : null);
    }).finally(() => { task.busy = false; });
  }
}
