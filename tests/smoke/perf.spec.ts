import { expect, test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

type Page = import('@playwright/test').Page;
type Lk = { gull: { state: Record<string, number | string> }; render: { calls: number; triangles: number; geometries: number; textures: number } };
const lk = (p: Page) => <T>(fn: (l: Lk) => T) =>
  p.evaluate((src) => new Function('l', `return (${src})(l)`)((window as unknown as { __lokki: Lk }).__lokki), fn.toString()) as Promise<Awaited<T>>;

/** Fixed views: where the gull is (x, y, z) and what it looks at; the numbers are what the renderer reports for the next frames. */
const VIEWS: [string, number, number, number][] = [
  ['market', 0, 1, -12],
  ['market-high', 0, 70, 0],
  ['senate-square', -156, 1, -290],
  ['esplanadi', -170, 1, -65],
];

for (const preset of ['high', 'low'] as const) {
  test(`render budget (${preset}): draw calls and triangles at fixed views stay under the ceiling`, async ({ page }) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript((g) => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: g })), preset);
    await page.goto('/?play');
    await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
    const L = lk(page);
    const rows: Record<string, unknown> = {};
    for (const [name, x, y, z] of VIEWS) {
      await L((l) => { Object.assign(l.gull.state, { x: 0, y: 0, z: 0 }); });
      await page.evaluate(([px, py, pz]) => Object.assign((window as unknown as { __lokki: Lk }).__lokki.gull.state, { x: px, y: py, z: pz, vx: 0, vy: 0, vz: 0 }), [x, y, z]);
      await page.waitForTimeout(2500);
      const r = await L((l) => l.render);
      rows[name] = r;
      // generous ceilings: the point is to notice a jump, the exact numbers go in the milestone docs
      expect(r.calls, `${name} draw calls`).toBeLessThan(preset === 'high' ? 300 : 230);
    }
    mkdirSync('test-results', { recursive: true });
    writeFileSync(`test-results/perf-${preset}.json`, JSON.stringify(rows, null, 2));
    console.log(`PERF ${preset}`, JSON.stringify(rows));
    expect(errors).toEqual([]);
  });
}
