import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  gull: { state: Record<string, unknown> };
  npcs: { npcs: { role: string; x: number; z: number; mode: string }[] };
  dogs: { x: number; z: number }[];
  peckNow: () => boolean;
  honkNow: () => void;
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
const stand = (l: ReturnType<typeof L>, x: number, z: number) => l((k, a) => { Object.assign(k.gull.state, { x: a![0], y: 0.5, z: a![1], vx: 0, vy: 0, vz: 0, mode: 'ground' }); return 0; }, [x, z] as never);

test('Leaf Blower: low wingbeats blow caps off the quay', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'leaf-blower');
  for (let i = 0; i < 60 && !(await done(l, 'blowchain', 'one')); i++) {
    // hover behind the middle cap, following it as it goes
    await l((x) => { const c = (x as unknown as { interaction: { props: { props: { tag?: string; cur: { p: { x: number; z: number } } }[] } } }).interaction.props.props.find((p) => p.tag === 'blowCap' && Math.abs(p.cur.p.x) < 1)!; Object.assign(x.gull.state, { x: c.cur.p.x, y: 2.2, z: c.cur.p.z - 2.3, vx: 0, vy: 0, vz: 0, flapAnim: 0, mode: 'air' }); return 0; });
    await page.waitForTimeout(250);
  }
  expect(await done(l, 'blowchain', 'one')).toBe(true);
  expect(errors).toEqual([]);
});

test('Domino Rally: push the first tile, the row falls into the queue', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'domino-rally');
  await stand(l, -14, -18.6);
  expect(await l((x) => x.peckNow())).toBe(true);
  await expect.poll(() => done(l, 'dominochain', 'fall'), { timeout: 30_000, intervals: [500] }).toBe(true);
  expect(errors).toEqual([]);
});

test('Captain Gull: with the cap on, guards do not notice a gull beside them', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'captain-gull');
  await stand(l, -6, -20.8);
  expect(await l((x) => x.peckNow())).toBe(true);
  await stand(l, 1.6, -17);
  await page.waitForTimeout(3000);
  expect(await l((x) => x.npcs.npcs.filter((n) => n.role === 'guard').every((n) => n.mode === 'idle'))).toBe(true);
  expect(errors).toEqual([]);
});

test('Hush Puppy: a honk calls the dog across the picnic', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'hush-puppy');
  await l((x) => { Object.assign(x.gull.state, { x: -204, y: 9, z: -52, vx: 0, vy: 0, vz: 0, mode: 'air' }); return 0; });
  await l((x) => { x.honkNow(); return 0; });
  await expect.poll(() => l((x) => x.dogs[0].x), { timeout: 20_000, intervals: [500] }).toBeLessThan(-185);
  await expect.poll(() => done(l, 'hushchain', 'honk'), { timeout: 20_000, intervals: [500] }).toBe(true);
  expect(errors).toEqual([]);
});
