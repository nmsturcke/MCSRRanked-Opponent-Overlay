import { test, expect } from '@playwright/test';

test('optional real API smoke: browser CORS, profile resolution, and live envelope', async ({ page }) => {
  test.skip(process.env.LIVE_API_SMOKE !== '1', 'Opt in explicitly; the ordinary suite uses fixtures.');
  await page.goto('/');
  await page.getByLabel('Your Minecraft username').fill('Nickyux');
  await page.getByRole('button', { name: /Generate overlay link/ }).click();
  await expect(page.locator('#form-status')).toContainText('Found Nickyux', { timeout: 15_000 });
  const url = new URL(await page.getByLabel('Your overlay URL').inputValue());
  expect(url.searchParams.get('uuid')).toBe('7a349920e0ab4f658431fcaefcbf27be');
  const live = await page.evaluate(async () => {
    const response = await fetch('https://api.mcsrranked.com/live', { cache: 'no-store', credentials: 'omit' });
    const body = await response.json();
    return { ok: response.ok, status: body.status, matchesIsArray: Array.isArray(body.data?.liveMatches) };
  });
  expect(live).toEqual({ ok: true, status: 'success', matchesIsArray: true });
});
