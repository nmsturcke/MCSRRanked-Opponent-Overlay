import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, HttpRankedApi, parseLive, REQUEST_TIMEOUT } from '../../src/api';
import { apiLive, apiProfile, apiVersus, OTHER, SELF } from '../fixtures';

const signal = () => new AbortController().signal;
const success = (data: unknown) => new Response(JSON.stringify({ status: 'success', data }));

afterEach(() => vi.useRealTimers());

describe('API transport and validation', () => {
  it('omits credentials and bypasses browser caching', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(success(apiProfile()));
    const result = await new HttpRankedApi(fetcher).profile('Speedrunner', signal());
    expect(result).toMatchObject({ uuid: OTHER, winRate: 60, twitch: 'speedrunner' });
    expect(fetcher).toHaveBeenCalledWith('https://api.mcsrranked.com/users/Speedrunner', expect.objectContaining({ cache: 'no-store', credentials: 'omit' }));
  });
  it('parses the real live-feed shape and treats null Elo as unavailable', () => {
    const data = apiLive();
    const matches = parseLive(data);
    expect(matches[0]?.streams[OTHER]).toBe('https://twitch.tv/speedrunner');
    expect(parseLive({ liveMatches: [{ currentTime: 0, players: [{ uuid: OTHER, nickname: 'NewPlayer', eloRate: null, eloRank: null }] }] })[0]?.players[0]?.eloRate).toBeNull();
    expect(() => parseLive({ liveMatches: null })).toThrow();
    expect(() => parseLive({ liveMatches: [{ players: 'wrong' }] })).toThrow();
  });
  it('converts only the documented no-history response into a zero record', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'error', data: null }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'error', data: null }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'error', data: 'invalid' }), { status: 400 }))
      .mockResolvedValueOnce(success(apiVersus));
    const api = new HttpRankedApi(fetcher);
    expect(await api.versus(SELF, OTHER, signal())).toEqual({ wins: 0, draws: 0, losses: 0 });
    await expect(api.versus(SELF, OTHER, signal())).rejects.toThrow();
    await expect(api.versus(SELF, OTHER, signal())).rejects.toThrow();
    expect(await api.versus(SELF, OTHER, signal())).toEqual({ wins: 4, draws: 1, losses: 3 });
  });
  it('handles non-JSON errors and rate limits with unreadable or explicit retry headers', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('<html>down</html>', { status: 502 }))
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '120' } }));
    const api = new HttpRankedApi(fetcher);
    await expect(api.live(signal())).rejects.toBeInstanceOf(ApiError);
    await expect(api.live(signal())).rejects.toMatchObject({ status: 429, retryAfterMs: 60_000 });
    await expect(api.live(signal())).rejects.toMatchObject({ retryAfterMs: 120_000 });
  });
  it('aborts hung requests on timeout', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const promise = new HttpRankedApi(fetcher).live(signal());
    const assertion = expect(promise).rejects.toThrow('Aborted');
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
