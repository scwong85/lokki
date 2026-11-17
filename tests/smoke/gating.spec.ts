import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = { gate: { arc: number; stage: number } | null; peckNow: () => boolean; hidden: boolean; gull: { state: Record<string, unknown> }; interaction: { gates: { poop: boolean; tug: boolean; toss: boolean } }; npcs: { gates: { contagion: boolean; slam: boolean; slip: boolean } } };
const L = (page: Page) => <T>(fn: (l: Lk) => T) =>
  page.evaluate((src) => new Function('l', `return (${src})(l)`)((window as unknown as { __lokki: Lk }).__lokki), fn.toString()) as Promise<Awaited<T>>;
const open = async (page: Page, q: string) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto(`/?${q}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return L(page);
};

test('gate 1.1: the jukebox, the bush and the verbs are locked; gate 1.5 opens them', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let l = await open(page, 'level=jukebox-hero&gate=1.1');
  expect(await l((x) => x.gate)).toEqual({ arc: 1, stage: 1 });
  await l((x) => { Object.assign(x.gull.state, { x: -6, y: 0.5, z: -16.8, vx: 0, vy: 0, vz: 0, mode: 'ground' }); return 0; });
  expect(await l((x) => x.peckNow())).toBe(false); // the jukebox is a stage 4 toy
  expect(await l((x) => x.interaction.gates)).toEqual({ poop: false, toss: false, tug: false });
  expect(await l((x) => x.npcs.gates)).toEqual({ contagion: false, slam: false, slip: false });
  l = await open(page, 'level=jukebox-hero&gate=1.5');
  await l((x) => { Object.assign(x.gull.state, { x: -6, y: 0.5, z: -16.8, vx: 0, vy: 0, vz: 0, mode: 'ground' }); return 0; });
  expect(await l((x) => x.peckNow())).toBe(true);
  expect(await l((x) => x.interaction.gates.poop)).toBe(true);
  expect(errors).toEqual([]);
});

test('no gate: everything is available', async ({ page }) => {
  test.setTimeout(200_000);
  const l = await open(page, 'level=jukebox-hero');
  expect(await l((x) => x.gate)).toBeNull();
  expect(await l((x) => x.npcs.gates.slam)).toBe(true);
});
