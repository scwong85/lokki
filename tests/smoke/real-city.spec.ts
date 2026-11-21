import { test, expect } from '@playwright/test';

/** Aerial views for the M108 before/after (buildings styled by their real era and facade material). SHOT=before|after names the files. */
test('real city: aerial views', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'high', tutorialDone: true })));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?level=sandbox&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  const shot = process.env.SHOT ?? 'after';
  const views = [
    { name: 'market', x: 40, y: 45, z: 40, heading: 0.5 }, // over the harbour, looking at the market front and the Esplanadi corner
    { name: 'senate', x: -60, y: 60, z: -170, heading: 0.6 }, // towards Senate Square
    { name: 'jugend', x: 120, y: 50, z: -40, heading: -0.9 }, // towards Katajanokka
  ];
  for (const v of views) {
    await page.evaluate((a) => {
      const l = (window as unknown as { __lokki: { gull: { state: Record<string, unknown> } } }).__lokki;
      Object.assign(l.gull.state, { x: a.x, y: a.y, z: a.z, vx: 0, vy: 0, vz: 0, heading: a.heading, mode: 'air', stamina: 999 });
    }, v);
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `tests/__screenshots__/real-city-${v.name}-${shot}.png` });
  }
  expect(errors).toEqual([]);
});
