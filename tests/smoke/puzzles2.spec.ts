import { expect, test } from '@playwright/test';

type Lk = {
  gull: { state: Record<string, number | string> };
  peckNow: () => boolean;
  npcs: { npcs: { role: string; x: number; z: number; mood: string; goal: { name: string } | null }[] };
  quests: { onEvent(e: string): unknown; quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  interaction: { props: { spawn(s: object): unknown } };
  runLog: { tally(): Record<string, number> };
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

test('Grand Opening: in the Reporter\'s photo, the ribbon cut with his scissors, and the angry Mayor buys himself a cone', async ({ page }) => {
  test.setTimeout(500_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'grand-opening');
  expect(await roles(page)).toEqual(expect.arrayContaining(['mayor', 'selfie', 'vendor', 'guest']));
  // stand between the Reporter and the Mayor and wait for the click
  await expect(async () => {
    await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: -6.5, y: 1.0, z: -7.8, vx: 0, vy: 0, vz: 0, mode: 'air' }); });
    expect(await done(page, 'opening', 'photo')).toBe(true);
  }).toPass({ timeout: 300_000, intervals: [2000] });
  // scissors on the ribbon: the cut, and the Mayor is furious
  await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.props.spawn({ type: 'scissors', x: -10, y: 0.3, z: -10.5, tag: 'scissors' }));
  await expect.poll(() => done(page, 'opening', 'cut'), { timeout: 60_000, intervals: [1000] }).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.find((n) => n.role === 'mayor')!.mood)).toMatch(/angry|upset/); // furious, and already on his way to a comforting cone
  // ...and he treats himself at the kiosk
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: 10, y: 8, z: -20, vx: 0, vy: 0, vz: 0, mode: 'air' }); });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.runLog.tally()['bought:mayor'] ?? 0), { timeout: 300_000, intervals: [3000] }).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('Fire Drill: the alarm marches the queue to the muster; the sprinkler soaks the Fishmonger; chased into the drill he is put in line', async ({ page }) => {
  test.setTimeout(500_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'fire-drill');
  expect(await roles(page)).toEqual(expect.arrayContaining(['cleaner', 'guard', 'guest']));
  const goto = (x: number, z: number) => page.evaluate(([a, b]) => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: a, y: 0.4, z: b, vx: 0, vy: 0, vz: 0, mode: 'ground' }); }, [x, z]);
  await goto(-30, -11);
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.peckNow())).toBe(true); // the sprinkler
  await expect.poll(() => done(page, 'drill', 'soak'), { timeout: 120_000, intervals: [2000] }).toBe(true);
  await goto(-14, -11);
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.peckNow())).toBe(true); // the alarm
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: -20, y: 12, z: -30, vx: 0, vy: 0, vz: 0, mode: 'air' }); }); // and fly off
  await expect.poll(() => done(page, 'drill', 'drill'), { timeout: 300_000, intervals: [3000] }).toBe(true);
  // the Fishmonger arrives at the muster (as if chasing the gull): the Guard puts him in line
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; const m = l.npcs.npcs.find((n) => n.role === 'cleaner')!; m.x = -5; m.z = -9; });
  await expect.poll(() => done(page, 'drill', 'line'), { timeout: 60_000, intervals: [1000] }).toBe(true);
  expect(errors).toEqual([]);
});
