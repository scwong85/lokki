import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  gate: { arc: number; stage: number } | null;
  quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  gull: { state: Record<string, unknown> };
  interaction: { gates: { poop: boolean; toss: boolean; tug: boolean } };
  npcs: { gates: { contagion: boolean; slam: boolean; slip: boolean } };
  hidden: boolean;
  peckNow: () => boolean;
};
const L = (page: Page) => <T>(fn: (l: Lk) => T) =>
  page.evaluate((src) => new Function('l', `return (${src})(l)`)((window as unknown as { __lokki: Lk }).__lokki), fn.toString()) as Promise<Awaited<T>>;
const open = async (page: Page, id: string) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto(`/?level=${id}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return L(page);
};

test('stage 1.3: tug, hiding and the buttons work; heat and lines are up', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'a1s3');
  expect(await l((x) => x.gate)).toEqual({ arc: 1, stage: 3 });
  expect(await l((x) => x.interaction.gates)).toEqual({ poop: true, toss: true, tug: true });
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['tugchain', 'spray', 'booschain', 'buttonchain']);
  await l((x) => { Object.assign(x.gull.state, { x: -8, y: 0.5, z: -16, vx: 0, vy: 0, vz: 0, mode: 'ground' }); return 0; });
  await expect.poll(() => l((x) => x.hidden), { timeout: 10_000 }).toBe(true);
  await l((x) => { Object.assign(x.gull.state, { x: -22, y: 0.5, z: -18.8, vx: 0, vy: 0, vz: 0, mode: 'ground' }); return 0; });
  expect(await l((x) => x.peckNow())).toBe(true);
  expect(errors).toEqual([]);
});

test('stage 1.4: taunt, slip and the jukebox work; contagion is still locked', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'a1s4');
  expect(await l((x) => x.gate)).toEqual({ arc: 1, stage: 4 });
  expect(await l((x) => x.npcs.gates)).toEqual({ contagion: false, slam: false, slip: true });
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['mapcone', 'wetfloor', 'jukechain']);
  await l((x) => { Object.assign(x.gull.state, { x: -6, y: 0.5, z: -16.8, vx: 0, vy: 0, vz: 0, mode: 'ground' }); return 0; });
  expect(await l((x) => x.peckNow())).toBe(true);
  expect(errors).toEqual([]);
});
