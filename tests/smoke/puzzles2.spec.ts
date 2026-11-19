import { expect, test } from '@playwright/test';

type Lk = {
  gull: { state: Record<string, number | string> };
  peckNow: () => boolean;
  npcs: { npcs: { role: string; x: number; z: number; mood: string }[] };
  quests: { onEvent(e: string): unknown; quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  interaction: { props: { spawn(s: object): unknown } };
};
type Page = import('@playwright/test').Page;
const open = async (page: Page, id: string) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto(`/?level=${id}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
};
const done = (page: Page, q: string, o: string) =>
  page.evaluate(([a, b]) => (window as unknown as { __lokki: Lk }).__lokki.quests.quests.find((x) => x.id === a)!.objectives.find((x) => x.id === b)!.done, [q, o]);
const roles = (page: Page) => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.map((n) => n.role));

test('Grand Opening: the whole chain runs on real triggers (crowd, scissors, ribbon needs the crowd, cone to the reporter)', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'grand-opening');
  expect(await roles(page)).toEqual(expect.arrayContaining(['mayor', 'vendor', 'reporter', 'guest']));
  const spawn = (s: object) => page.evaluate((x) => (window as unknown as { __lokki: Lk }).__lokki.interaction.props.spawn(x), s);
  // scissors on the ribbon with nobody there: nothing
  await spawn({ type: 'scissors', x: -10, y: 0.3, z: -10.5, tag: 'scissors' });
  await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.quests.onEvent('grab:scissors'));
  await page.waitForTimeout(4000);
  expect(await done(page, 'opening', 'scissors')).toBe(true);
  expect(await done(page, 'opening', 'cut')).toBe(false);
  // five guests come to the ribbon: the crowd step, and then the cut
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; l.npcs.npcs.filter((n) => n.role === 'guest').slice(0, 4).forEach((n, i) => { n.x = -12 + i; n.z = -9; }); });
  await expect.poll(() => done(page, 'opening', 'crowd'), { timeout: 60_000, intervals: [1000] }).toBe(true);
  await expect.poll(() => done(page, 'opening', 'cut'), { timeout: 60_000, intervals: [1000] }).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.find((n) => n.role === 'mayor')!.mood)).toBe('angry'); // the world reacts
  // the first cone to the reporter
  await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.quests.onEvent('grab:firstCone'));
  await spawn({ type: 'icecream', x: -4, y: 0.3, z: -9, tag: 'firstCone' });
  await expect.poll(() => done(page, 'opening', 'press'), { timeout: 60_000, intervals: [1000] }).toBe(true);
  expect(errors).toEqual([]);
});

test('Fire Drill: the alarm empties the stall and sends the guard off; the sprinkler soaks the fishmonger', async ({ page }) => {
  test.setTimeout(500_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'fire-drill');
  expect(await roles(page)).toEqual(expect.arrayContaining(['fishmonger', 'guard', 'guest']));
  const goto = (x: number, z: number) => page.evaluate(([a, b]) => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: a, y: 0.4, z: b, vx: 0, vy: 0, vz: 0, mode: 'ground' }); }, [x, z]);
  await goto(-30, -11);
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.peckNow())).toBe(true); // the sprinkler button
  await expect.poll(() => done(page, 'drill', 'monger'), { timeout: 120_000, intervals: [2000] }).toBe(true);
  await goto(-14, -11);
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.peckNow())).toBe(true); // the alarm
  await expect.poll(() => done(page, 'drill', 'stall'), { timeout: 300_000, intervals: [3000] }).toBe(true);
  await expect.poll(() => done(page, 'drill', 'guard'), { timeout: 300_000, intervals: [3000] }).toBe(true);
  expect(errors).toEqual([]);
});

test('Grand Opening: pecking the jukebox by the ribbon draws a crowd to the ribbon (the crowd step ticks on its own)', async ({ page }) => {
  test.setTimeout(500_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'grand-opening');
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: -13.5, y: 0.4, z: -9.8, vx: 0, vy: 0, vz: 0, mode: 'ground' }); });
  await expect.poll(async () => {
    await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.peckNow()); // keep the music up (a peck during the cooldown does nothing)
    return done(page, 'opening', 'crowd');
  }, { timeout: 420_000, intervals: [4000] }).toBe(true);
  expect(errors).toEqual([]);
});
