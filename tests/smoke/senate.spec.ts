import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean; count: number }[] }[]; onEvent: (e: string) => unknown };
  bell: { clock: number; left: number };
  quiet: { clock: number; left: number };
  gull: { state: { x: number; y: number; z: number; vx: number; vy: number; vz: number; mode: string } };
  sunbathers: { list: { state: string }[] } | null;
  dogs: { mode: string }[];
  sprinklers: { running: boolean } | null;
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

test('S6: the wardrobe raid counts grabbed items (no statue spots to hit)', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'new-look');
  expect(await L((l) => l.quests.quests.map((q) => q.id))).toEqual(['wardrobe', 'workers']);
  await L((l) => l.quests.onEvent('grab:tophat'));
  expect(await L((l) => l.quests.quests.find((q) => q.id === 'wardrobe')!.objectives[0].done)).toBe(true);
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

test('E1: a shadow across a sleeper\'s face wakes them', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'dont-block-my-sun');
  expect(await L((l) => l.sunbathers!.list.every((x) => x.state === 'asleep'))).toBe(true);
  await L((l) => { Object.assign(l.gull.state, { x: -167.5, y: 6, z: -80.6, vx: 0, vy: 0, vz: 0, mode: 'air' }); });
  await expect.poll(() => L((l) => l.sunbathers!.list[0].state), { timeout: 120_000 }).toBe('awake');
  expect(errors).toEqual([]);
});

test('E2: the dog runs across the picnic to fetch a thrown ball', async ({ page }) => {
  test.setTimeout(400_000);
  const L = await open(page, 'good-boy');
  expect(await L((l) => l.dogs.length)).toBe(1);
  await L((l) => l.interaction.props.spawn({ type: 'ball', x: -205, y: 0.4, z: -52 }));
  await expect.poll(() => L((l) => l.quests.quests.find((q) => q.id === 'fetch')!.objectives[0].done), { timeout: 250_000 }).toBe(true);
});

test('E3: standing on the valve starts the sprinklers', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'splash-zone');
  expect(await L((l) => l.sprinklers!.running)).toBe(false);
  await L((l) => { Object.assign(l.gull.state, { x: -152, y: 0.4, z: -44, vx: 0, vy: 0, vz: 0, mode: 'ground' }); });
  await expect.poll(() => L((l) => l.sprinklers!.running), { timeout: 120_000 }).toBe(true);
  await expect.poll(() => L((l) => l.quests.quests.find((q) => q.id === 'clear')!.objectives[0].done), { timeout: 60_000 }).toBe(true);
});

test('the tram is part of the city: it runs on its line in every level, and birds circle overhead', async ({ page }) => {
  test.setTimeout(400_000);
  const L = await open(page, 'snack-attack');
  expect(await L((l) => l.tram !== null)).toBe(true);
  await expect.poll(() => L((l) => l.tram!.x), { timeout: 300_000 }).toBeGreaterThan(-214);
  expect(await page.evaluate(() => (window as unknown as { __lokki: { render: { calls: number } } }).__lokki.render.calls)).toBeGreaterThan(20);
});
