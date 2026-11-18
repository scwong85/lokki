import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  gate: { arc: number; stage: number } | null;
  quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  gull: { state: Record<string, unknown> };
  strikePose: (k: string) => void;
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;
const open = async (page: Page, id: string) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto(`/?level=${id}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  return L(page);
};
const done = (l: ReturnType<typeof L>, q: string, o: string) => l((x, a) => x.quests.quests.find((m) => m.id === a![0])!.objectives.find((m) => m.id === a![1])!.done, [q, o] as never);

test('stage 2.1 Steps: loads in the Senate district with its three chains', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'a2s1');
  expect(await l((x) => x.gate)).toEqual({ arc: 2, stage: 1 });
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['cheese', 'peel', 'hotdog']);
  expect(errors).toEqual([]);
});

test('stage 2.2 Say Pigeon!: a pose at the click ruins the photo and ticks the first step', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'a2s2');
  expect(await l((x) => x.gate)).toEqual({ arc: 2, stage: 2 });
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['photos', 'caps', 'shutterbug']);
  // stand in front of the photographer's phone and keep posing until the click comes
  for (let i = 0; i < 120 && !(await done(l, 'photos', 'one')); i++) {
    await l((x) => { Object.assign(x.gull.state, { x: -156.5, y: 1.0, z: -311.8, vx: 0, vy: 0, vz: 0, mode: 'air' }); x.strikePose('wave'); return 0; });
    await page.waitForTimeout(400);
  }
  expect(await done(l, 'photos', 'one')).toBe(true);
  expect(errors).toEqual([]);
});

test('stage 2.3 Ding Dong: the bell ticks the first step', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'a2s3');
  expect(await l((x) => x.gate)).toEqual({ arc: 2, stage: 3 });
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['bell', 'lunch', 'bellsplat']);
  await l((x) => { (x as unknown as { ringBell: () => void }).ringBell(); return 0; });
  expect(await done(l, 'bell', 'wait')).toBe(true);
  expect(await done(l, 'bellsplat', 'wait')).toBe(true);
  expect(errors).toEqual([]);
});

test('stage 2.4 Turf War: the pigeons are there and the captain\'s cap works', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'a2s4');
  expect(await l((x) => x.gate)).toEqual({ arc: 2, stage: 4 });
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['forgive', 'wardrobe', 'captainchain']);
  await l((x) => { Object.assign(x.gull.state, { x: -148, y: 0.5, z: -288.8, vx: 0, vy: 0, vz: 0, mode: 'ground' }); return 0; });
  expect(await l((x) => (x as unknown as { peckNow: () => boolean }).peckNow())).toBe(true);
  expect(errors).toEqual([]);
});
