import { expect, test } from '@playwright/test';

type Lk = { music: { playing: string | null; current: string; slots: { tier: string; level: number; el: HTMLAudioElement }[] }; defense: { ensureHeat: (v: number) => unknown } };

test('music starts after a key press and crossfades to the chaos tier when the heat is high', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => {
    (window as unknown as { L: () => unknown }).L = () => (window as unknown as { __lokki: unknown }).__lokki;
  });
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as unknown as { L: () => Lk }).L().music.playing)).toBeNull(); // nothing before a gesture
  await page.keyboard.press('KeyW');
  await expect.poll(() => page.evaluate(() => (window as unknown as { L: () => Lk }).L().music.playing)).toBe('calm');
  await expect.poll(() => page.evaluate(() => (window as unknown as { L: () => Lk }).L().music.slots.some((s) => s.tier === 'calm' && !s.el.paused && s.el.currentTime > 0)), { timeout: 20_000 }).toBe(true);
  await page.evaluate(() => (window as unknown as { L: () => Lk }).L().defense.ensureHeat(95));
  await expect.poll(() => page.evaluate(() => (window as unknown as { L: () => Lk }).L().music.playing), { timeout: 10_000 }).toBe('chaos');
  await expect.poll(() => page.evaluate(() => (window as unknown as { L: () => Lk }).L().music.slots.find((s) => s.tier === 'chaos')?.level ?? 0), { timeout: 30_000 }).toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});
