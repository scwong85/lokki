import { expect, test } from '@playwright/test';

type Lk = { quests: { onEvent(e: string): unknown }; notes(n: unknown): void; polaroids: { album: { caption: string }[] } };

test('finishing a to-do with a victim takes a punchline photo a moment later, captioned with the wish', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=buffet&play&polaroid');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  const before = await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.polaroids.album.length);
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; l.notes(l.quests.onEvent('slipped:maitre')); }); // the Maître loses his dignity (as the game reports it)
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.polaroids.album.length), { timeout: 60_000, intervals: [500] }).toBeGreaterThan(before);
  const cap = await page.evaluate(() => { const a = (window as unknown as { __lokki: Lk }).__lokki.polaroids.album; return a[a.length - 1].caption; });
  expect(cap).toMatch(/Maître/);
  expect(errors).toEqual([]);
});
