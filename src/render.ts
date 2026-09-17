import fallbackAvatar from './assets/avatar.svg';
import type { DisplayOptions, OpponentView } from './types';

const formatter = new Intl.NumberFormat('en-US');

export class OpponentRenderer {
  private avatarTimer: ReturnType<typeof setTimeout> | undefined;
  private avatarUrl = '';
  private imageAttempts = 0;
  private readonly card: HTMLElement;
  private readonly avatar: HTMLImageElement;
  private readonly name: HTMLElement;
  private readonly rating: HTMLElement;
  private readonly rank: HTMLElement;
  private readonly record: HTMLElement;
  private readonly winRate: HTMLElement;
  private readonly twitch: HTMLElement;

  constructor(private readonly root: HTMLElement, private readonly sample = false) {
    root.innerHTML = `<article class="opponent-card" aria-label="Current opponent" hidden>
      <div class="opponent-identity">
        <img class="opponent-head" width="44" height="44" alt="" referrerpolicy="no-referrer">
        <div class="opponent-title"><span class="opponent-eyebrow">YOUR OPPONENT</span><strong class="opponent-name"></strong></div>
        <span class="opponent-live" aria-hidden="true"></span>
      </div>
      <div class="opponent-metrics">
        <div class="opponent-metric" data-field="elo"><span class="metric-label">ELO</span><div><strong data-value="rating"></strong><span class="opponent-rank" data-value="rank"></span></div></div>
        <div class="opponent-metric" data-field="headToHead"><span class="metric-label">YOUR W–D–L</span><strong data-value="record"></strong></div>
        <div class="opponent-metric" data-field="wr"><span class="metric-label">SEASON WIN RATE</span><strong data-value="wr"></strong></div>
      </div>
      <div class="opponent-twitch" data-field="twitch"><svg width="13" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 1h13v9l-4 4H8l-2 2v-2H2V1zm2 2v9h3v2l2-2h2l2-2V3H4zm3 2h2v4H7V5zm4 0h1v4h-1V5z"/></svg><span data-value="twitch"></span></div>
    </article>`;
    const select = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
    this.card = select('.opponent-card');
    this.avatar = select('.opponent-head');
    this.name = select('.opponent-name');
    this.rating = select('[data-value="rating"]');
    this.rank = select('[data-value="rank"]');
    this.record = select('[data-value="record"]');
    this.winRate = select('[data-value="wr"]');
    this.twitch = select('[data-value="twitch"]');
    this.avatar.addEventListener('error', () => {
      if (!this.avatarUrl || this.avatar.src === new URL(fallbackAvatar, document.baseURI).href) return;
      this.avatar.src = fallbackAvatar;
      clearTimeout(this.avatarTimer);
      this.avatarTimer = setTimeout(() => {
        if (this.avatarUrl) this.avatar.src = this.avatarUrl;
      }, Math.min(60_000, 15_000 * 2 ** Math.min(this.imageAttempts++, 2)));
    });
    this.avatar.addEventListener('load', () => {
      if (this.avatar.src === this.avatarUrl) this.imageAttempts = 0;
    });
  }

  render(view: OpponentView | null, options: DisplayOptions): void {
    this.card.hidden = view === null;
    if (!view) {
      clearTimeout(this.avatarTimer);
      this.avatarUrl = '';
      this.avatar.removeAttribute('src');
      this.name.textContent = '';
      return;
    }
    this.card.dataset.theme = options.theme;
    this.name.textContent = view.player.nickname;
    this.name.title = view.player.nickname;
    this.rating.textContent = view.player.eloRate === null ? 'Unrated' : formatter.format(view.player.eloRate);
    this.rank.textContent = view.player.eloRank === null ? 'Unranked' : `#${formatter.format(view.player.eloRank)}`;
    this.record.textContent = view.record ? `${view.record.wins}–${view.record.draws}–${view.record.losses}` : '—';
    this.winRate.textContent = view.winRate === null ? '—' : `${Number(view.winRate.toFixed(1))}%`;
    this.twitch.textContent = view.twitch ?? '';
    for (const field of ['elo', 'headToHead', 'wr', 'twitch'] as const) {
      this.root.querySelector<HTMLElement>(`[data-field="${field}"]`)!.hidden = !options[field] || (field === 'twitch' && !view.twitch);
    }
    this.root.querySelector<HTMLElement>('.opponent-metrics')!.hidden = !options.elo && !options.headToHead && !options.wr;
    this.avatar.hidden = !options.head;
    const url = options.head ? (this.sample ? new URL(fallbackAvatar, document.baseURI).href : `https://mc-heads.net/avatar/${view.player.uuid}/64`) : '';
    if (url !== this.avatarUrl) {
      clearTimeout(this.avatarTimer);
      this.avatarUrl = url;
      this.imageAttempts = 0;
      if (url) this.avatar.src = url;
      else this.avatar.removeAttribute('src');
    }
  }
}
