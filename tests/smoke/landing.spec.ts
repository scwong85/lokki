import { expect, test } from '@playwright/test';

const ev = <T>(page: import('@playwright/test').Page, js: string) => page.evaluate(`(() => { const l = window.__lokki; ${js} })()`) as Promise<T>;

test('land here (M122): a ring shows on the roof ahead, holding S glides onto it and stops there', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?level=a1s1&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  // gliding in toward the market hall roof (at -14, -17, 4.2 m high) from the south, 18 m out
  await ev(page, "Object.assign(l.gull.state, { x: -14, y: 13, z: 2, vx: 0, vy: -1, vz: -12, heading: 0, mode: 'air' }); l.cam.yaw = 0; return 0;");
  await expect.poll(() => ev<boolean>(page, 'return !!l.gull.state.landSpot;'), { timeout: 30_000, intervals: [100] }).toBe(true);
  const spot = await ev<{ x: number; y: number; z: number }>(page, 'return l.gull.state.landSpot;');
  expect(spot.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.down('KeyS');
  await expect.poll(() => ev<boolean>(page, 'return !!l.gull.state.landing || l.gull.state.mode === "ground";'), { timeout: 30_000, intervals: [100] }).toBe(true);
  await expect.poll(() => ev<string>(page, 'return l.gull.state.mode;'), { timeout: 120_000, intervals: [200] }).toBe('ground');
  await page.keyboard.up('KeyS');
  const s = await ev<{ x: number; y: number; z: number; v: number; stun: number }>(page, 'const s = l.gull.state; return { x: s.x, y: s.y, z: s.z, v: Math.hypot(s.vx, s.vz), stun: s.stunT };');
  expect(s.v).toBeLessThan(0.6); // it stopped on the spot, no skid (a held S while grounded walks back, so it was let go at once)
  expect(s.stun).toBe(0);
  await page.screenshot({ path: 'tests/__screenshots__/land-here.png' });
  expect(errors).toEqual([]);
});
