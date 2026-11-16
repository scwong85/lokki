import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean; count: number }[] }[]; onEvent: (e: string) => unknown };
  bell: { clock: number; left: number };
  quiet: { clock: number; left: number };
  tram: { x: number; mode: string; frontX: number } | null;
  gang: { mode: string } | null;
  interaction: { props: { props: { type: string; tag?: string }[]; spawn: (s: { type: string; x: number; y: number; z: number }) => unknown } };
};
type Ask = <T>(fn: (l: Lk, a?: unknown) => T, arg?: unknown) => Promise<Awaited<T>>;
const lk = (p: Page): Ask => (fn, arg) => p.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as never;
const open = async (page: Page, level: string) => {
  await page.goto(`/?level=${level}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return lk(page);
};

test('S1: the cheese waits on the landing at the top of the steps', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'cheese-run');
  expect(await L((l) => l.interaction.props.props.some((p) => p.type === 'cheese' && p.tag === 'cheese'))).toBe(true);
  expect(errors).toEqual([]);
});

test('S2: the photographers are in place and the level loads', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'say-pigeon');
  expect(await L((l) => l.quests.quests.some((q) => q.id === 'photos'))).toBe(true);
});

test('S3: the bell rings on schedule', async ({ page }) => {
  test.setTimeout(400_000);
  const L = await open(page, 'ding-dong');
  expect(await L((l) => l.quests.quests.some((q) => q.id === 'bell'))).toBe(true);
  await expect.poll(() => L((l) => l.bell.clock), { timeout: 300_000 }).toBeGreaterThan(9);
  expect(await L((l) => l.bell.clock)).toBeGreaterThan(8); // past the first ring at 8 s
});

test('S4: a bottle on the track stops the tram', async ({ page }) => {
  test.setTimeout(500_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'tram-surfing');
  expect(await L((l) => l.tram !== null)).toBe(true);
  await expect.poll(() => L((l) => l.tram!.x), { timeout: 200_000 }).toBeGreaterThan(-214);
  await L((l) => l.interaction.props.spawn({ type: 'bottle', x: l.tram!.frontX + 8, y: 0.5, z: -276 }));
  await expect.poll(() => L((l) => l.quests.quests.find((q) => q.id === 'lunch')!.objectives[0].done), { timeout: 200_000 }).toBe(true);
  expect(errors).toEqual([]);
});

test('S5: a bun makes the Pigeon Gang friends', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'turf-war');
  expect(await L((l) => l.gang!.mode)).toBe('guarding');
  await L((l) => l.interaction.props.spawn({ type: 'bun', x: -154, y: 0.5, z: -300 }));
  await expect.poll(() => L((l) => l.gang!.mode), { timeout: 120_000 }).toBe('friends');
  await expect.poll(() => L((l) => l.quests.quests.find((q) => q.id === 'diplomacy')!.objectives[0].done), { timeout: 60_000 }).toBe(true);
});

test('S6: a top hat dropped over the emperor counts', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'new-look');
  await L((l) => l.interaction.props.spawn({ type: 'tophat', x: -156.5, y: 7.5, z: -300 }));
  await expect.poll(() => L((l) => l.quests.quests.find((q) => q.id === 'makeover')!.objectives[0].done), { timeout: 120_000 }).toBe(true);
});

test('S7: the band falls silent and a caw rings every phone', async ({ page }) => {
  test.setTimeout(500_000);
  const L = await open(page, 'concert-night');
  await expect.poll(() => L((l) => l.quiet.left), { timeout: 400_000 }).toBeGreaterThan(0);
  await L((l) => l.quests.onEvent('caw'));
});

test('S8: toys delivered to the children count', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'christmas-market');
  await L((l) => { l.interaction.props.spawn({ type: 'toy', x: -166, y: 0.5, z: -292 }); l.interaction.props.spawn({ type: 'toy', x: -165, y: 0.5, z: -291 }); });
  await expect.poll(() => L((l) => l.quests.quests.find((q) => q.id === 'gifts')!.objectives[0].done), { timeout: 150_000 }).toBe(true);
});

test('S9: the library level loads with its students', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'library-rule');
  expect(await L((l) => l.quests.quests.some((q) => q.id === 'shhh'))).toBe(true);
});

test('S10: the finale has the tram, the pigeons and the key', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'key-to-the-city');
  expect(await L((l) => l.tram !== null && l.gang !== null)).toBe(true);
  expect(await L((l) => l.interaction.props.props.some((p) => p.tag === 'key'))).toBe(true);
  expect(errors).toEqual([]);
});
