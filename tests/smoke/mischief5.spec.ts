import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  gull: { state: Record<string, unknown> };
  npcs: { npcs: { role: string; x: number; z: number; stationary: boolean }[] };
  interaction: { props: { props: { tag?: string }[] } };
  peckNow: () => boolean;
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

test('Tablecloth Trick: yank the cloth, buns fly and the diners jump', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'tablecloth');
  await stand(l, -6, -14.8);
  expect(await l((x) => x.peckNow())).toBe(true);
  expect(await l((x) => x.interaction.props.props.filter((p) => p.tag === 'clothBun').length)).toBe(4);
  await expect.poll(() => done(l, 'clothchain', 'jump'), { timeout: 20_000, intervals: [500] }).toBe(true);
  expect(errors).toEqual([]);
});

test('Service Bell: the waiter comes to the bell', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'service-bell');
  await stand(l, -6, -18.5);
  expect(await l((x) => x.peckNow())).toBe(true);
  await stand(l, 60, -34); // fly off: a gull standing there makes him wary
  await expect.poll(() => l((x) => { const w = x.npcs.npcs.find((n) => n.role === 'waiter')!; return Math.hypot(w.x + 6, w.z + 20); }), { timeout: 40_000, intervals: [1000] }).toBeLessThan(6);
  expect(await done(l, 'bellchain', 'ring')).toBe(true);
  expect(errors).toEqual([]);
});
