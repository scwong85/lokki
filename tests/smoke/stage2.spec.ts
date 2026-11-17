import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  gate: { arc: number; stage: number } | null;
  quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  gull: { state: Record<string, unknown> };
  interaction: { gates: { poop: boolean; toss: boolean; tug: boolean } };
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;
const done = (l: ReturnType<typeof L>, q: string, o: string) => l((x, a) => x.quests.quests.find((m) => m.id === a![0])!.objectives.find((m) => m.id === a![1])!.done, [q, o] as never);

test('stage 1.2: poop and toss unlocked, tug locked; a honk from behind drops cones', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=a1s2&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  const l = L(page);
  expect(await l((x) => x.gate)).toEqual({ arc: 1, stage: 2 });
  expect(await l((x) => x.interaction.gates)).toEqual({ poop: true, toss: true, tug: false });
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['freak', 'bottleService', 'honkchain']);
  // behind the row of tourists who face the sea, a quick tap of T
  await l((x) => { Object.assign(x.gull.state, { x: 0, y: 0.5, z: -15, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'ground' }); return 0; });
  await page.waitForTimeout(1200);
  await page.evaluate(() => (window as unknown as { __lokki: { honkNow: () => void } }).__lokki.honkNow());
  await expect.poll(() => done(l, 'honkchain', 'honk'), { timeout: 20_000, intervals: [500] }).toBe(true);
  expect(errors).toEqual([]);
});
