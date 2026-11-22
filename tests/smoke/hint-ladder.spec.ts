import { expect, test } from '@playwright/test';

/** Stage 1.4 is the hint-ladder trial: the note shows the wish only, J asks for more, the map marker comes with rung 2. */
test('hint ladder: outcome first, J climbs, the full hint arrives last; the Options setting can show it all', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=mood-swings-v1&gate=1.5&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  const note = () => page.locator('#todo').innerText();
  // rung 0: the wish, no method
  await expect.poll(note).toContain('The tourist');
  expect(await note()).not.toMatch(/Hold T|Dive on it|\(E\)/);
  expect(await page.locator('#todo .hint').count()).toBe(0);
  // J: a cryptic line, then the marker, then the full hint
  await page.keyboard.press('KeyJ');
  await expect.poll(() => page.locator('#todo .hint').count(), { timeout: 60_000 }).toBeGreaterThanOrEqual(1);
  const afterOne = await note();
  expect(afterOne).toMatch(/not looking/);
  expect(afterOne).not.toMatch(/Dive on it/);
  await page.waitForTimeout(2500); // one press per frame counts: space them out
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(2500);
  await page.keyboard.press('KeyJ');
  await expect.poll(note, { timeout: 60_000 }).toMatch(/Dive on it|east end of the quay/);
  expect(errors).toEqual([]);
});

test('hint ladder: "all at once" shows the old note straight away', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true, hints: 'full' })));
  await page.goto('/?level=mood-swings-v1&gate=1.5&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  await expect.poll(() => page.locator('#todo').innerText()).toMatch(/Snatch the map from the tourist/);
  await expect.poll(() => page.locator('#todo').innerText()).toMatch(/east end of the quay/);
});
