import { expect, test } from '@playwright/test';

type Lk = { polaroids: { request(c: string): void; album: { url: string; caption: string }[] } };

test('a polaroid is taken from the canvas, and the level list groups levels by district', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.polaroids.request('Say cheese!'));
  await page.waitForFunction(() => (window as unknown as { __lokki: Lk }).__lokki.polaroids.album.length === 1, null, { timeout: 20_000 });
  const first = await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.polaroids.album[0]);
  expect(first.caption).toBe('Say cheese!');
  expect(first.url.startsWith('data:image/jpeg')).toBe(true);
  expect(first.url.length).toBeGreaterThan(3000); // a real picture, not an empty canvas
  await expect(page.locator('#polaroid-pop')).toBeVisible();
  await page.keyboard.press('KeyL');
  await expect(page.locator('#levelselect .ls-district').first()).toBeVisible();
  expect(await page.locator('#levelselect .ls-district').count()).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: 'tests/__screenshots__/m41-levels.png' });
  expect(errors).toEqual([]);
});
