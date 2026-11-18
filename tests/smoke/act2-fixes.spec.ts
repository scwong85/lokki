import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  gull: { state: { x: number; y: number; z: number } & Record<string, unknown> };
  npcs: { npcs: { role: string; x: number; y: number; z: number }[] };
  quests: { onEvent: (e: string) => unknown; quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  interaction: { carried: { type: string } | null; props: { props: { type: string; heldBy: number | null; carried: boolean; cur: { p: { x: number; y: number; z: number } } }[] } };
};
const open = async (page: Page, q: string) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto(`/?${q}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
};
const lk = <T>(page: Page, fn: (l: Lk) => T) => page.evaluate((src) => new Function('l', `return (${src})(l)`)((window as unknown as { __lokki: Lk }).__lokki), fn.toString()) as Promise<Awaited<T>>;

test('a stage in Senate Square starts the gull in Senate Square, not at the Market Square', async ({ page }) => {
  test.setTimeout(240_000);
  await open(page, 'level=a2s1');
  const p = await lk(page, (l) => ({ x: l.gull.state.x, z: l.gull.state.z }));
  expect(Math.hypot(p.x + 156.5, p.z + 290)).toBeLessThan(15); // SENATE_START
});

test('stage 2.5: the conductor stands on the stage, and carrying the baton round it conducts', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'level=a2s5');
  expect(await lk(page, (l) => l.npcs.npcs.find((n) => n.role === 'conductor')!.y)).toBeGreaterThan(0.9);
  // the earlier steps of the chain
  await lk(page, (l) => { for (let i = 0; i < 3; i++) l.quests.onEvent('photobomb'); l.quests.onEvent('mimicQuiet'); return 0; });
  // take the baton for real (E), then carry it past the three corners of the stage
  for (let k = 0; k < 14; k++) {
    const got = await lk(page, (l) => { if (l.interaction.carried?.type === 'baton') return true; const b = l.interaction.props.props.find((p) => p.type === 'baton' && p.heldBy === null && !p.carried); if (b) Object.assign(l.gull.state, { x: b.cur.p.x, y: b.cur.p.y + 0.6, z: b.cur.p.z + 0.3, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'air' }); return false; });
    if (got) break;
    await page.waitForTimeout(250);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(600);
  }
  expect(await lk(page, (l) => l.interaction.carried?.type)).toBe('baton');
  for (const [x, z] of [[-176.5, -310], [-176.5, -296], [-172.5, -303]]) {
    await page.evaluate(([px, pz]) => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: px, y: 2.5, z: pz, vx: 0, vy: 0, vz: 0, mode: 'air' }); }, [x, z]);
    await page.waitForTimeout(1500);
  }
  await expect.poll(() => lk(page, (l) => l.quests.quests.find((q) => q.id === 'screen')!.objectives.find((o) => o.id === 'around')!.done), { timeout: 60_000, intervals: [500] }).toBe(true);
  expect(errors).toEqual([]);
});
