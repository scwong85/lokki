import { expect, test } from '@playwright/test';

type Lk = {
  gull: { state: Record<string, number | string> };
  peckNow: () => boolean;
  npcs: { npcs: { role: string; x: number; z: number; heading: number; mode: string }[] };
  quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  runLog: { tally(): Record<string, number> };
  interaction: { carried: { tag?: string } | null; props: { props: { tag?: string; cur: { p: { x: number; y: number; z: number } } }[] } };
};
const open = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=buffet&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
};
const done = (page: import('@playwright/test').Page, o: string) =>
  page.evaluate((id) => (window as unknown as { __lokki: Lk }).__lokki.quests.quests.find((q) => q.id === 'buffet')!.objectives.find((x) => x.id === id)!.done, o);

test('buffet: the cast is there, and ringing the bell takes the chef away (the step ticks whatever the cause)', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.map((n) => n.role).filter((r) => ['chef', 'maitre', 'granny'].includes(r)).sort())).toEqual(['chef', 'granny', 'maitre']);
  expect(await done(page, 'chef')).toBe(false);
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: 12, y: 0.4, z: -24.5, vx: 0, vy: 0, vz: 0, mode: 'ground' }); });
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.peckNow())).toBe(true);
  await expect.poll(() => done(page, 'chef'), { timeout: 300_000, intervals: [3000] }).toBe(true);
  expect(errors).toEqual([]);
});

test('buffet: taking the pie in front of a watcher who faces you gets you caught', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  // the chef turns to face the gull, which stands at the table
  await page.evaluate(() => {
    const l = (window as unknown as { __lokki: Lk }).__lokki;
    const chef = l.npcs.npcs.find((n) => n.role === 'chef')!;
    Object.assign(l.gull.state, { x: 0, y: 1.15, z: -19.2, vx: 0, vy: 0, vz: 0, heading: Math.PI, mode: 'air' });
    chef.heading = Math.atan2(-(0 - chef.x), -(-19 - chef.z));
  });
  await expect(async () => {
    await page.keyboard.press('KeyE');
    expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.carried?.tag)).toBe('goldenPie');
  }).toPass({ timeout: 60_000, intervals: [1000] });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.runLog.tally()['caught:chef'] ?? 0), { timeout: 200_000, intervals: [2000] }).toBeGreaterThanOrEqual(1);
  expect(await done(page, 'pie')).toBe(true);
  expect(errors).toEqual([]);
});

test('buffet: a watcher who catches you takes the pie back to the table and the gull is thrown back, dazed', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: 0, y: 1.15, z: -19.2, vx: 0, vy: 0, vz: 0, heading: Math.PI, mode: 'air' }); });
  await expect(async () => {
    await page.keyboard.press('KeyE');
    expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.carried?.tag)).toBe('goldenPie');
  }).toPass({ timeout: 60_000, intervals: [1000] });
  // the chef has chased the gull down
  await page.evaluate(() => {
    const l = (window as unknown as { __lokki: Lk }).__lokki;
    const chef = l.npcs.npcs.find((n) => n.role === 'chef')! as unknown as { x: number; z: number; mode: string };
    chef.x = Number(l.gull.state.x) + 1; chef.z = Number(l.gull.state.z);
    chef.mode = 'chase';
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.carried), { timeout: 60_000, intervals: [500] }).toBeNull();
  const pie = await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; return l.interaction.props.props.find((p) => p.tag === 'goldenPie')!.cur.p; });
  expect(Math.hypot(pie.x - 0, pie.z + 20)).toBeLessThan(1.5); // back on the table
  expect(errors).toEqual([]);
});
