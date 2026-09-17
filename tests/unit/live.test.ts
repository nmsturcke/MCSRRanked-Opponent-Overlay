import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api';
import { backoff, findMatch, OverlayController, POLL_MS, STATS_TTL_MS } from '../../src/live';
import type { LiveMatch, OpponentView, Profile, RankedApi, RecordStats } from '../../src/types';
import { config, match, opponent, profile, SELF, THIRD } from '../fixtures';

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};

function setup(options = config) {
  const api = {
    live: vi.fn<RankedApi['live']>().mockResolvedValue([match()]),
    profile: vi.fn<RankedApi['profile']>().mockResolvedValue(profile),
    versus: vi.fn<RankedApi['versus']>().mockResolvedValue({ wins: 4, draws: 1, losses: 3 }),
  };
  const render = vi.fn<(view: OpponentView | null) => void>();
  const controller = new OverlayController(options, api, render, () => 0);
  return { api, render, controller, current: () => render.mock.lastCall?.[0] };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('match selection', () => {
  it('finds self regardless of array position', () => {
    const value = match();
    value.players.reverse();
    expect(findMatch([value], SELF)).toBe(value);
  });
  it('rejects absent, duplicate, incomplete, and ambiguous participants', () => {
    expect(findMatch([], SELF)).toBeNull();
    expect(findMatch([match(), match()], SELF)).toBeNull();
    expect(findMatch([{ ...match(), players: [opponent] }], SELF)).toBeNull();
    expect(findMatch([{ ...match(), players: [match().players[0]!, match().players[0]!] }], SELF)).toBeNull();
    expect(findMatch([{ ...match(), players: [...match().players, { ...opponent, uuid: THIRD }] }], SELF)).toBeNull();
  });
});

describe('overlay lifecycle', () => {
  it('renders identity before details and never requests disabled extras', async () => {
    const { api, controller, current } = setup({ ...config, headToHead: false, wr: false, twitch: false });
    controller.start();
    await flush();
    expect(current()?.player.nickname).toBe('Speedrunner');
    expect(api.profile).not.toHaveBeenCalled();
    expect(api.versus).not.toHaveBeenCalled();
    controller.stop();
  });
  it('clears immediately when a successful feed no longer contains the match', async () => {
    const { api, controller, current } = setup();
    controller.start(); await flush();
    expect(current()?.record?.draws).toBe(1);
    api.live.mockResolvedValue([]);
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(current()).toBeNull();
    controller.stop();
  });
  it('discards late details after a match ends', async () => {
    const late = deferred<Profile>();
    const { api, controller, current } = setup();
    api.profile.mockReturnValueOnce(late.promise);
    controller.start(); await flush();
    api.live.mockResolvedValue([]);
    await vi.advanceTimersByTimeAsync(POLL_MS);
    late.resolve(profile); await flush();
    expect(current()).toBeNull();
    controller.stop();
  });
  it('does not allow a previous opponent to overwrite a new one', async () => {
    const late = deferred<RecordStats>();
    const { api, controller, current } = setup();
    api.versus.mockReturnValueOnce(late.promise);
    controller.start(); await flush();
    api.live.mockResolvedValue([match({ ...opponent, uuid: THIRD, nickname: 'NextOpponent' })]);
    api.versus.mockResolvedValue({ wins: 0, draws: 0, losses: 2 });
    await vi.advanceTimersByTimeAsync(POLL_MS);
    late.resolve({ wins: 99, draws: 0, losses: 0 }); await flush();
    expect(current()).toMatchObject({ player: { nickname: 'NextOpponent' }, record: { wins: 0, losses: 2 } });
    controller.stop();
  });
  it('hides after the initial failure plus three retries, keeps trying, and recovers', async () => {
    const { api, controller, current } = setup();
    controller.start(); await flush();
    api.live.mockRejectedValue(new Error('Offline'));
    await vi.advanceTimersByTimeAsync(5_000); // initial failure
    expect(current()).not.toBeNull();
    await vi.advanceTimersByTimeAsync(5_000); // retry 1
    await vi.advanceTimersByTimeAsync(10_000); // retry 2
    expect(current()).not.toBeNull();
    await vi.advanceTimersByTimeAsync(20_000); // retry 3
    expect(current()).toBeNull();
    const attempts = api.live.mock.calls.length;
    await vi.advanceTimersByTimeAsync(180_000);
    expect(api.live.mock.calls.length).toBeGreaterThan(attempts);
    api.live.mockResolvedValue([match()]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(current()?.player.uuid).toBe(opponent.uuid);
    controller.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('retries username resolution and optional stats without stopping live polling', async () => {
    const { api, controller, current } = setup({ ...config, uuid: undefined });
    api.profile.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ ...profile, uuid: SELF });
    api.versus.mockRejectedValueOnce(new Error('Busy'));
    controller.start(); await flush();
    expect(current()).toBeNull();
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(current()?.player.nickname).toBe('Speedrunner');
    expect(current()?.record).toBeNull();
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(current()?.record?.wins).toBe(4);
    controller.stop();
  });
  it('refreshes stats on a timer reset against the same opponent and on TTL expiry', async () => {
    const { api, controller } = setup();
    controller.start(); await flush();
    api.live.mockResolvedValue([match(opponent, 0)]);
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(api.versus).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(STATS_TTL_MS);
    expect(api.versus).toHaveBeenCalledTimes(3);
    controller.stop();
  });
  it('shares a rate-limit cooldown across requests and resumes afterward', async () => {
    const { api, controller, current } = setup();
    api.profile.mockRejectedValueOnce(new ApiError('Limited', 429, 120_000));
    controller.start(); await flush();
    expect(current()).toBeNull();
    const calls = api.live.mock.calls.length;
    await vi.advanceTimersByTimeAsync(119_999);
    expect(api.live).toHaveBeenCalledTimes(calls);
    await vi.advanceTimersByTimeAsync(1);
    expect(current()?.player.nickname).toBe('Speedrunner');
    controller.stop();
  });
  it('does not overlap live requests or restart from a late stopped lifecycle', async () => {
    const late = deferred<LiveMatch[]>();
    const { api, controller, current } = setup();
    api.live.mockReturnValueOnce(late.promise);
    controller.start(); controller.start();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(api.live).toHaveBeenCalledTimes(1);
    controller.stop();
    api.live.mockResolvedValue([]);
    controller.start(); await flush();
    late.resolve([match()]); await flush();
    expect(current()).toBeNull();
    expect(vi.getTimerCount()).toBe(1);
    controller.stop();
  });
  it('caps retry delays without capping attempts', () => {
    expect(backoff(1, () => 0)).toBe(5_000);
    expect(backoff(999, () => 1)).toBe(60_000);
  });
});
