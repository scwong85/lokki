import { expect, test } from '@playwright/test';

type Lk = {
  gull: { state: Record<string, number | string> };
  peckNow: () => boolean;
  npcs: { npcs: { role: string; x: number; z: number; heading: number; mode: string; obliviousT: number; goal: { name: string } | null }[] };
  quests: { quests: { id: string; objectives: { id: string; done: boolean; count: number }[] }[] };
  runLog: { tally(): Record<string, number> };
  interaction: { carried: { tag?: string } | null; props: { props: { tag?: string; cur: { p: { x: number; y: number; z: number } } }[] } };
};
type Page = import('@playwright/test').Page;
const open = async (page: Page) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=buffet&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
};
const step = (page: Page, o: string) =>
  page.evaluate((id) => (window as unknown as { __lokki: Lk }).__lokki.quests.quests.find((q) => q.id === 'buffet')!.objectives.find((x) => x.id === id)!, o);
const grabPie = async (page: Page) => {
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: 0, y: 1.15, z: -19.2, vx: 0, vy: 0, vz: 0, heading: Math.PI, mode: 'air' }); });
  await expect(async () => {
    await page.keyboard.press('KeyE');
    expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.carried?.tag)).toBe('goldenPie');
  }).toPass({ timeout: 60_000, intervals: [1000] });
};

test('buffet: the bell sends the Chef to answer it, and his arrival counts towards "for nobody, three times"', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.map((n) => n.role).filter((r) => ['chef', 'maitre', 'granny'].includes(r)).sort())).toEqual(['chef', 'granny', 'maitre']);
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: 12, y: 0.4, z: -24.5, vx: 0, vy: 0, vz: 0, mode: 'ground' }); });
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.peckNow())).toBe(true);
  await expect.poll(async () => (await step(page, 'bell')).count, { timeout: 300_000, intervals: [3000] }).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('buffet: taking the pie in front of the Chef gets you caught, and if he reaches you the pie goes back on the table', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; const chef = l.npcs.npcs.find((n) => n.role === 'chef')!; chef.heading = Math.atan2(-(0 - chef.x), -(-19.2 - chef.z)); });
  await grabPie(page);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.runLog.tally()['caught:chef'] ?? 0), { timeout: 200_000, intervals: [2000] }).toBeGreaterThanOrEqual(1);
  await page.evaluate(() => {
    const l = (window as unknown as { __lokki: Lk }).__lokki;
    const chef = l.npcs.npcs.find((n) => n.role === 'chef')!;
    chef.x = Number(l.gull.state.x) + 1; chef.z = Number(l.gull.state.z); chef.mode = 'chase';
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.carried), { timeout: 60_000, intervals: [500] }).toBeNull();
  const pie = await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.props.props.find((p) => p.tag === 'goldenPie')!.cur.p);
  expect(Math.hypot(pie.x, pie.z + 20)).toBeLessThan(3); // back at the buffet table
  expect(errors).toEqual([]);
});

test('buffet finale: the pie put down by Granny is eaten, and the Chef is sent over to see it', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; l.npcs.npcs.find((n) => n.role === 'chef')!.obliviousT = 60; }); // the bell did its work
  await grabPie(page);
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; const g = l.npcs.npcs.find((n) => n.role === 'granny')!; Object.assign(l.gull.state, { x: g.x + 1.2, y: 0.4, z: g.z, vx: 0, vy: 0, vz: 0, heading: Math.PI / 2, mode: 'ground' }); });
  await expect(async () => {
    await page.keyboard.press('KeyE');
    expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.carried)).toBeNull();
  }).toPass({ timeout: 30_000, intervals: [800] });
  // step back: with a gull at her elbow she only watches it
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: -17, y: 12, z: -30, vx: 0, vy: 0, vz: 0, mode: 'air' }); });
  await expect.poll(async () => (await step(page, 'granny')).done, { timeout: 200_000, intervals: [2000] }).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.find((n) => n.role === 'chef')!.goal?.name ?? 'arrived')).toMatch(/pieScene|arrived/);
  expect(errors).toEqual([]);
});
