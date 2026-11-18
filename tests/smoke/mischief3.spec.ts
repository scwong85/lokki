import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Npc = { id: number; role: string; x: number; z: number; holding: number | null; mode: string };
type Lk = {
  npcs: { npcs: Npc[]; soakRadius: (x: number, z: number, r: number) => number; slam: (s: unknown) => boolean; snatchCandidates: (b: { x: number; y: number; z: number }) => { id: number }[] };
  quests: { onEvent: (e: string) => unknown; quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  gull: { state: Record<string, unknown> & { x: number; z: number } };
  peckNow: () => boolean;
  switches: { id: string }[];
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;
const open = async (page: Page, id: string) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto(`/?level=${id}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return L(page);
};
const done = (l: ReturnType<typeof L>, q: string, o: string) => l((x, a) => x.quests.quests.find((m) => m.id === a![0])!.objectives.find((m) => m.id === a![1])!.done, [q, o] as never);

test('Rush Hour: a fright spreads down the queue', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'rush-hour');
  await l((x) => { x.quests.onEvent('poopNpc:queuer'); const n = x.npcs.npcs[0]; x.npcs.soakRadius(n.x, n.z, 0.5); return 0; });
  await expect.poll(() => done(l, 'rushchain', 'spread'), { timeout: 30_000, intervals: [1000] }).toBe(true);
  expect(errors).toEqual([]);
});

test('Strike!: a fast dive knocks four people down', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'strike');
  await l((x) => { const n = x.npcs.npcs[0]; Object.assign(x.gull.state, { x: n.x, y: 0.9, z: n.z, vx: 0, vy: 0, vz: -20, mode: 'dive', diveAngle: 0.1 }); return x.npcs.slam(x.gull.state); });
  await expect.poll(() => done(l, 'strikechain', 'strike'), { timeout: 30_000, intervals: [1000] }).toBe(true);
  expect(errors).toEqual([]);
});

test('Jukebox Hero: peck the jukebox and four people dance', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'jukebox-hero');
  expect(await l((x) => x.switches.length)).toBe(1);
  await l((x) => { Object.assign(x.gull.state, { x: -6, y: 0.5, z: -16.8, vx: 0, vy: 0, vz: 0, mode: 'ground' }); return 0; });
  expect(await l((x) => x.peckNow())).toBe(true);
  await expect.poll(() => done(l, 'jukechain', 'dance'), { timeout: 20_000, intervals: [500] }).toBe(true);
  expect(await l((x) => x.npcs.npcs.filter((n) => n.mode === 'dance').length)).toBe(4);
  expect(errors).toEqual([]);
});
