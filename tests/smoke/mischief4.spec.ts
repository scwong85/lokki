import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  gull: { state: Record<string, unknown> };
  peckNow: () => boolean;
  honkNow: () => void;
  hidden: boolean;
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

test('Big Red Button: the alarm and the sprinkler button can both be pecked', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'red-button');
  await stand(l, -22, -18.8);
  expect(await l((x) => x.peckNow())).toBe(true);
  await stand(l, 22, -18.8);
  expect(await l((x) => x.peckNow())).toBe(true);
  await expect.poll(() => done(l, 'buttonchain', 'sprinkle'), { timeout: 20_000, intervals: [500] }).toBe(true);
  expect(errors).toEqual([]);
});

test('Peekaboo: hide in the bush, honk, and they drop their cones', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'peekaboo');
  await stand(l, -8, -16);
  await expect.poll(() => l((x) => x.hidden), { timeout: 10_000 }).toBe(true);
  await l((x) => { x.honkNow(); return 0; });
  await expect.poll(() => done(l, 'booschain', 'boo'), { timeout: 20_000, intervals: [500] }).toBe(true);
  expect(errors).toEqual([]);
});
