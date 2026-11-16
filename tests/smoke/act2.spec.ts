import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Body = { setTranslation: (v: { x: number; y: number; z: number }, w: boolean) => void };
type Lk = {
  notes: (n: unknown) => void;
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean; count: number }[] }[]; onEvent: (e: string) => unknown };
  noise: (x: number, z: number, loud: number) => void;
  skills: { has: (id: string) => boolean };
  abilities: { use: (id: string) => boolean; disguised: boolean };
  gull: { state: Record<string, number | string>; setDisguise: (b: boolean) => void };
  defense: { hiddenLines: boolean; response: { deployed: Set<string> } } | null;
  interaction: { props: { props: { type: string; tag?: string; body: Body }[] } };
};
type Ask = <T>(fn: (l: Lk, a?: unknown) => T, arg?: unknown) => Promise<Awaited<T>>;
const lk = (p: Page): Ask => (fn, arg) => p.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as never;
const open = async (page: Page, level: string) => {
  await page.goto(`/?level=${level}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return lk(page);
};
const done = (L: Ask, q: string, o: string) => L((l, a) => { const [qq, oo] = a as [string, string]; return l.quests.quests.find((x) => x.id === qq)?.objectives.find((x) => x.id === oo)?.done ?? false; }, [q, o]);

test('level 9: crow calls herd the tour group into the photo frame', async ({ page }) => {
  test.setTimeout(480_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'caw-of-the-wild');
  expect(await L((l) => l.skills.has('mimic'))).toBe(true); // lent for the level
  await L((l) => l.noise(17, -15, 1.7)); // a crow call in the middle of the frame, loud enough to carry
  await expect.poll(() => done(L, 'photo', 'herd'), { timeout: 400_000 }).toBe(true);
  expect(errors).toEqual([]);
});

test('level 10: the lines are hidden until hawk-eye, and hawk-eye is lent', async ({ page }) => {
  test.setTimeout(240_000);
  const L = await open(page, 'invisible-maze');
  expect(await L((l) => l.skills.has('hawkeye'))).toBe(true);
  expect(await L((l) => l.defense!.hiddenLines)).toBe(true);
  expect(await L((l) => [...l.defense!.response.deployed])).toEqual(['lines']);
});

test('level 11: three chairs in the spot with one on top is a tower', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'heavy-lifting');
  expect(await L((l) => l.skills.has('fatbird'))).toBe(true);
  await L((l) => {
    const chairs = l.interaction.props.props.filter((p) => p.type === 'chair');
    const at = [[-24.5, 0.5, -16], [-23.5, 0.5, -16], [-24, 0.5, -15], [-24, 1.1, -16]];
    chairs.slice(0, 4).forEach((c, i) => c.body.setTranslation({ x: at[i][0], y: at[i][1], z: at[i][2] }, true));
  });
  await expect.poll(() => done(L, 'tower', 'three'), { timeout: 120_000 }).toBe(true);
});

test('level 12: a noise near a vendor makes him stare (and the flock call is lent)', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'gulls-eleven');
  expect(await L((l) => l.skills.has('flock'))).toBe(true);
  await L((l) => l.noise(0, -33, 1));
  await expect.poll(() => L((l) => l.quests.quests.find((q) => q.id === 'stare')!.objectives[0].count), { timeout: 120_000 }).toBeGreaterThan(0);
});

test('level 13: flying breaks the pigeon disguise', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'coo-coo-undercover');
  expect(await L((l) => l.skills.has('disguise'))).toBe(true);
  await L((l) => {
    l.abilities.use('disguise');
    l.gull.setDisguise(true);
  });
  expect(await L((l) => l.abilities.disguised)).toBe(true);
  await L((l) => {
    Object.assign(l.gull.state, { mode: 'air', y: 12 });
  });
  await expect.poll(() => L((l) => l.abilities.disguised), { timeout: 120_000 }).toBe(false);
});

test('level 14: gliding into a thermal counts as riding it', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'thermal-express');
  expect(await L((l) => l.skills.has('flight'))).toBe(true);
  await L((l) => {
    Object.assign(l.gull.state, { x: 55, z: -42, y: 30, mode: 'air', vx: 0, vz: -14, vy: 0 });
  });
  await expect.poll(() => L((l) => l.quests.quests.find((q) => q.id === 'riders')!.objectives[0].count), { timeout: 120_000 }).toBeGreaterThanOrEqual(1);
});
