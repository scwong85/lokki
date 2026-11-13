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
  const place = (x: number, y: number, z: number) =>
    page.evaluate(([x, y, z]) => {
      const { gull, cam } = (window as unknown as { __lokki: Lokki }).__lokki;
      Object.assign(gull.state, { x, y, z, vx: 0, vy: 0, vz: 0, heading: 0, mode: y > 1 ? 'air' : 'ground', stamina: 100, stunT: 0 });
      cam.yaw = 0;
      cam.pitch = 0.4;
    }, [x, y, z]);

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

  // once the net is up (it takes a moment to be put up) it stops a gull flying into it
  await page.waitForTimeout(3500);
  await place(-20, 3.0, -50);
  await page.waitForFunction(() => (window as unknown as { __lokki: Lokki }).__lokki.gull.state.stunT > 0, null, { timeout: 15_000 });

  // the Warden swats a low gull standing next to him
  const w = await page.evaluate(() => { const w = (window as unknown as { __lokki: Lokki }).__lokki.defense.warden!; return { x: w.x, z: w.z }; });
  await place(w.x + 3, 0.5, w.z + 3);
  await page.waitForFunction(() => (window as unknown as { __lokki: Lokki }).__lokki.defense.warden!.mode !== 'patrol', null, { timeout: 15_000 });

  const frames = () => page.evaluate(() => (window as unknown as { __raf: () => number }).__raf());
  const a = await frames();
  await page.waitForTimeout(800);
  expect(await frames()).toBeGreaterThan(a); // render loop still alive
  expect(errors).toEqual([]);
});
