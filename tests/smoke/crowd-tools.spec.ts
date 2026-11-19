import { expect, test } from '@playwright/test';

type Lk = {
  gull: { state: Record<string, unknown> };
  honkNow: () => void;
  interaction: { props: { props: { type: string; broken: boolean; tag?: string; cur: { p: { x: number; z: number } } }[]; spawn(s: object): unknown } };
  npcs: { npcs: { role: string; x: number; z: number }[]; crumbsEaten: number };
  quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
};
const open = async (page: import('@playwright/test').Page, id: string) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto(`/?level=${id}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
};
const step = (page: import('@playwright/test').Page, q: string, o: string) =>
  page.evaluate(([a, b]) => (window as unknown as { __lokki: Lk }).__lokki.quests.quests.find((x) => x.id === a)!.objectives.find((x) => x.id === b)!.done, [q, o]);

test('Shoo!: a honk clears the crowd from the stall and ticks the first step', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'shoo');
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: -6, y: 0.4, z: -20, vx: 0, vy: 0, vz: 0, mode: 'ground' }); });
  await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.honkNow()); // one honk is enough: people walk off and the square empties
  await expect.poll(() => step(page, 'shoochain', 'clear'), { timeout: 240_000, intervals: [3000] }).toBe(true);
  expect(errors).toEqual([]);
});

test('Breadcrumbs: buns on the ground draw a hungry person, who eats it (the trail step counts)', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'breadcrumbs');
  // buns lie by the start; put three down by the bench, where the crowd is meant to gather
  await page.evaluate(() => {
    const l = (window as unknown as { __lokki: Lk }).__lokki;
    for (const [x, z] of [[-6, -14], [-5, -13], [-7, -13]]) l.interaction.props.spawn({ type: 'bun', x, y: 0.2, z });
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.crumbsEaten), { timeout: 240_000, intervals: [3000] }).toBeGreaterThanOrEqual(3);
  expect(await step(page, 'crumbchain', 'trail')).toBe(false); // needs the first step (a bun picked up) before it counts
  expect(errors).toEqual([]);
});
