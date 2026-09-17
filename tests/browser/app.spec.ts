import { test, expect, type Page } from '@playwright/test';
import { apiLive, apiProfile, apiVersus, player, SELF } from '../fixtures';
import { THEMES } from '../../src/types';

async function mockApi(page: Page, visible = true) {
  await page.route('https://api.mcsrranked.com/**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = path === '/live' ? apiLive(visible)
      : path.includes('/versus/') ? apiVersus
      : apiProfile(path.endsWith('/Nickyux') ? player : undefined);
    return route.fulfill({ json: { status: 'success', data } });
  });
  await page.route('https://mc-heads.net/**', route => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path fill="#bd9a75" d="M0 0h64v64H0z"/></svg>',
  }));
}

test('setup preview, idle state, generated URL, and clipboard', async ({ page, context }) => {
  await mockApi(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.locator('.next-step')).toHaveClass('username-input next-step');
  await page.getByLabel('Your Minecraft username').click();
  await expect(page.locator('.next-step')).toHaveAttribute('id', 'generate');
  await expect(page.getByText('One of you needs to be streaming.')).toBeVisible();
  await expect(page.locator('.opponent-name')).toHaveText('Speedrunner');
  await page.getByRole('button', { name: 'Idle', exact: true }).click();
  await expect(page.locator('.opponent-card')).toBeHidden();
  await expect(page.getByText("Nothing here. That's the point.")).toBeVisible();
  await page.getByRole('button', { name: 'In a match', exact: true }).click();
  await page.getByRole('checkbox', { name: /Player head/ }).uncheck();
  await expect(page.locator('.opponent-head')).toBeHidden();
  await page.getByLabel('Your Minecraft username').fill('Nickyux');
  await page.getByRole('button', { name: /Generate overlay link/ }).click();
  await expect(page.getByLabel('Your overlay URL')).toBeVisible();
  await expect(page.locator('.next-step')).toHaveAttribute('id', 'copy-link');
  const link = await page.getByLabel('Your overlay URL').inputValue();
  expect(new URL(link).searchParams.get('uuid')).toBe(SELF);
  expect(new URL(link).searchParams.get('head')).toBe('false');
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(page.locator('#copy-status')).toContainText('Copied');
  await expect(page.locator('.next-step')).toHaveAttribute('id', 'toolscreen-settings');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
  await page.screenshot({ path: 'test-results/setup-desktop.png', fullPage: true });
  await page.getByRole('checkbox', { name: /Twitch/ }).uncheck();
  await expect(page.locator('.next-step')).toHaveAttribute('id', 'copy-link');
  await page.getByLabel('Your Minecraft username').fill('SomeoneElse');
  await expect(page.locator('#link-result')).toBeHidden();
  await expect(page.locator('.next-step')).toHaveAttribute('id', 'generate');
});

test('mobile setup has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.opponent-name')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/setup-mobile.png', fullPage: true });
});

test('desktop setup fits in one screen before and after generating a link', async ({ page, context }) => {
  await mockApi(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  for (const [width, height] of [[1280, 720], [1366, 768], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const fits = async () => {
      const workspace = await page.locator('.workspace').boundingBox();
      expect(workspace!.y + workspace!.height + 6).toBeLessThanOrEqual(height);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    };
    await fits();
    await page.getByRole('radio', { name: /Clear/ }).check();
    await page.getByLabel('Your Minecraft username').fill('Nickyux');
    await page.getByRole('button', { name: /Generate overlay link/ }).click();
    await expect(page.getByLabel('Your overlay URL')).toBeVisible();
    await fits();
    await page.getByRole('button', { name: 'Copy link', exact: true }).click();
    await expect(page.locator('#copy-status')).toContainText('Copied');
    await fits();
    await page.screenshot({ path: `test-results/setup-compact-${width}.png` });
  }
});

test('direct overlay navigation shows selected stats and clears fully on match end', async ({ page }) => {
  await mockApi(page);
  await page.clock.install();
  await page.goto(`/opponent/?v=1&uuid=${SELF}&head=true&headToHead=true&wr=true&elo=true&twitch=true`);
  await expect(page.locator('.opponent-name')).toHaveText('Speedrunner');
  await expect(page.locator('[data-value="record"]')).toHaveText('4–1–3');
  await expect(page.locator('[data-value="wr"]')).toHaveText('60%');
  await expect(page.locator('[data-value="rank"]')).toHaveText('#128');
  await expect(page.locator('[data-value="twitch"]')).toHaveText('speedrunner');
  await expect(page.locator('.opponent-head')).toHaveAttribute('src', /^https:\/\/mc-heads\.net\/avatar\/[a-f0-9-]+\/64$/);
  await expect.poll(() => page.locator('.opponent-head').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await page.screenshot({ path: 'test-results/overlay-active.png', omitBackground: true });
  await page.route('https://api.mcsrranked.com/live', route => route.fulfill({ json: { status: 'success', data: apiLive(false) } }));
  await page.clock.runFor(5_100);
  await expect(page.locator('.opponent-card')).toBeHidden();
  expect(await page.locator('body').innerText()).toBe('');
  await page.screenshot({ path: 'test-results/overlay-idle.png', omitBackground: true });
});

test('overlay hides on repeated failures and recovers without reloading', async ({ page }) => {
  await mockApi(page);
  await page.clock.install();
  await page.goto(`/opponent/?uuid=${SELF}`);
  await expect(page.locator('.opponent-name')).toHaveText('Speedrunner');
  let fail = true;
  let failures = 0;
  await page.route('https://api.mcsrranked.com/live', route => {
    if (fail) {
      failures++;
      return route.fulfill({ status: 503, json: { status: 'error', data: 'Unavailable' } });
    }
    return route.fulfill({ json: { status: 'success', data: apiLive() } });
  });
  for (let i = 1; i <= 4; i++) {
    await page.clock.runFor(i === 1 ? 5_100 : [0, 0, 6_000, 12_000, 24_000][i]!);
    await expect.poll(() => failures).toBeGreaterThanOrEqual(i);
  }
  await expect(page.locator('.opponent-card')).toBeHidden();
  fail = false;
  // Let mocked network responses settle before advancing past request timeouts.
  await expect(async () => {
    await page.clock.runFor(1_000);
    await expect(page.locator('.opponent-name')).toHaveText('Speedrunner', { timeout: 100 });
  }).toPass({ timeout: 20_000, intervals: [50] });
  await expect(page.locator('.opponent-card')).toBeVisible();
});

test('disabled fields and malformed URLs stay out of the overlay', async ({ page }) => {
  await mockApi(page);
  await page.goto(`/opponent/?uuid=${SELF}&head=false&headToHead=false&wr=false&elo=false&twitch=false`);
  await expect(page.locator('.opponent-name')).toHaveText('Speedrunner');
  await expect(page.locator('.opponent-metrics')).toBeHidden();
  await expect(page.locator('.opponent-head')).toBeHidden();
  await expect(page.locator('.opponent-twitch')).toBeHidden();
  await page.goto('/opponent/?user=Nickyux&wr=not-a-boolean');
  expect(await page.locator('body').innerText()).toBe('');
  await expect(page.locator('.opponent-card')).toHaveCount(0);
});

test('setup reports account lookup failure without generating a broken link', async ({ page }) => {
  await page.route('https://api.mcsrranked.com/**', route => route.fulfill({ status: 400, json: { status: 'error', data: null } }));
  await page.goto('/');
  await page.getByLabel('Your Minecraft username').fill('NoProfile');
  await page.getByRole('button', { name: /Generate overlay link/ }).click();
  await expect(page.locator('#form-status')).toContainText('No Ranked profile found');
  await expect(page.locator('#link-result')).toBeHidden();
  await expect(page.locator('.next-step')).toHaveAttribute('id', 'generate');
});

test('guide supports reduced motion and manual copying when clipboard access fails', async ({ page }) => {
  await mockApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', { value: () => Promise.reject(new Error('Denied')) });
  });
  await page.goto('/');
  const particle = page.locator('.guide-particles i').first();
  await expect(particle).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.guide-particles')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.guide-particles')).toHaveCSS('pointer-events', 'none');
  await page.getByLabel('Your Minecraft username').fill('Nickyux');
  await page.getByRole('button', { name: /Generate overlay link/ }).click();
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(page.locator('#copy-status')).toContainText('Select and copy');
  await expect(page.locator('.next-step')).toHaveAttribute('id', 'copy-link');
  await page.getByLabel('Your overlay URL').press('Control+c');
  await expect(page.locator('.next-step')).toHaveAttribute('id', 'toolscreen-settings');
});

test('theme selection updates preview and generated link, with contextual Toolscreen guidance', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByLabel('Your Minecraft username').fill('Nickyux');
  await page.getByRole('button', { name: /Generate overlay link/ }).click();
  await expect(page.getByLabel('Your overlay URL')).toBeVisible();
  for (const theme of THEMES) {
    await page.locator(`input[name="theme"][value="${theme}"]`).check();
    await expect(page.locator('.opponent-card')).toHaveAttribute('data-theme', theme);
    expect(new URL(await page.getByLabel('Your overlay URL').inputValue()).searchParams.get('theme')).toBe(theme);
  }
  await page.getByRole('radio', { name: /Clear/ }).check();
  await expect(page.locator('#transparent-help')).toBeVisible();
  await expect(page.locator('#recommended-size')).toHaveText('390 × 170');
  await page.getByRole('checkbox', { name: /Twitch/ }).uncheck();
  await expect(page.locator('#recommended-size')).toHaveText('390 × 140');
  for (const name of [/Head to head/, /Win rate/, /Elo & rank/]) await page.getByRole('checkbox', { name }).uncheck();
  await expect(page.locator('#recommended-size')).toHaveText('390 × 76');
  await expect(page.getByText('Top Right (Screen)', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.toolscreen-toggles')).toContainText('Refresh on Update');
});

test('all themes fit the advertised sizes and preserve the transparent canvas', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 170 });
  for (const theme of THEMES) {
    await page.goto(`/opponent/?uuid=${SELF}&theme=${theme}`);
    await expect(page.locator('[data-value="wr"]')).toHaveText('60%');
    const card = page.locator('.opponent-card');
    const box = await card.boundingBox();
    expect(box?.width).toBe(390);
    expect(box!.height).toBeLessThanOrEqual(170);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    if (theme === 'transparent') {
      const style = await card.evaluate(element => {
        const css = getComputedStyle(element);
        return { background: css.backgroundColor, border: css.borderLeftColor, shadow: css.textShadow };
      });
      expect(style.background).toBe('rgba(0, 0, 0, 0)');
      expect(style.border).toBe('rgba(0, 0, 0, 0)');
      expect(style.shadow).not.toBe('none');
    }
    await page.screenshot({ path: `test-results/theme-${theme}.png`, omitBackground: true });
  }
  for (const [params, height] of [['&twitch=false', 140], ['&headToHead=false&elo=false&wr=false&twitch=false', 76]] as const) {
    await page.setViewportSize({ width: 390, height });
    await page.goto(`/opponent/?uuid=${SELF}${params}`);
    await expect(page.locator('.opponent-name')).toHaveText('Speedrunner');
    expect((await page.locator('.opponent-card').boundingBox())!.height).toBeLessThanOrEqual(height);
    await page.screenshot({ path: `test-results/overlay-${height}.png`, omitBackground: true });
  }
});
