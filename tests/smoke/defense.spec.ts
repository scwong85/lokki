import { expect, test } from '@playwright/test';

type Lokki = {
  gull: { state: { x: number; y: number; z: number; vx: number; vy: number; vz: number; heading: number; mode: string; stunT: number; stamina: number } };
  cam: { yaw: number; pitch: number };
  defense: {
    addHeat: (r: string) => unknown;
    heat: { value: number; tier: number };
    response: { deployed: Set<string> };
    warden: { x: number; z: number; mode: string } | null;
  };
};

test('heat escalates the city (vendors, lines, nets, Warden) and the deterrents can stop the gull', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => {
    let n = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (f) => raf((t) => { n++; f(t); });
    (window as unknown as { __raf: () => number }).__raf = () => n;
  });
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  const deployed = () => page.evaluate(() => [...(window as unknown as { __lokki: Lokki }).__lokki.defense.response.deployed]);
  expect(await deployed()).toEqual([]);
  // each big mischief pushes the heat up a tier; the city answers in order
  const heat = (r: string) => page.evaluate((r) => (window as unknown as { __lokki: Lokki }).__lokki.defense.addHeat(r), r);
  await heat('snatch');
  expect(await deployed()).toEqual(['vendors']);
  await heat('snatch');
  expect(await deployed()).toEqual(['vendors', 'lines']);
  await heat('snatch');
  await heat('snatch');
  expect(await deployed()).toEqual(['vendors', 'lines', 'nets', 'warden']);

  // the lines and the net take a moment to be put up (in simulated time, which runs slowly in a headless browser):
  // keep the gull at net height until it is caught, whenever that is
  await page.waitForFunction(
    () => {
      const { gull, cam } = (window as unknown as { __lokki: Lokki }).__lokki;
      if (gull.state.stunT > 0) return true;
      Object.assign(gull.state, { x: -20, y: 3.9, z: -40, vx: 0, vy: -4, vz: 0, heading: 0, mode: 'air', stamina: 100 }); // coming down into the net
      cam.yaw = 0;
      return false;
    },
    null,
    { timeout: 40_000, polling: 100 },
  );

  // the Warden swats a low gull standing next to him
  await page.waitForFunction(
    () => {
      const { gull, defense } = (window as unknown as { __lokki: Lokki }).__lokki;
      const w = defense.warden!;
      if (w.mode !== 'patrol') return true;
      Object.assign(gull.state, { x: w.x + 3, y: 0.5, z: w.z + 3, vx: 0, vy: 0, vz: 0, mode: 'ground', stunT: 0 });
      return false;
    },
    null,
    { timeout: 40_000, polling: 100 },
  );

  const frames = () => page.evaluate(() => (window as unknown as { __raf: () => number }).__raf());
  const a = await frames();
  await page.waitForTimeout(800);
  expect(await frames()).toBeGreaterThan(a); // render loop still alive
  expect(errors).toEqual([]);
});
