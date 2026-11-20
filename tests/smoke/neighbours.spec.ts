import { expect, test } from '@playwright/test';

type Lk = { gull: { state: Record<string, number | string> } };

test('a hidden to-do half-reveals when the gull is near its spot', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=buffet&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  const note = () => page.locator('#todo').innerText();
  expect(await note()).not.toContain('sweet tooth');
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: -15, y: 3, z: -12, vx: 0, vy: 0, vz: 0, mode: 'air' }); });
  await expect.poll(note, { timeout: 60_000 }).toContain("Granny's sweet tooth");
  expect(errors).toEqual([]);
});
