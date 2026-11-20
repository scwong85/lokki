import { expect, test } from '@playwright/test';

type Lk = {
  gull: { state: Record<string, number | string> };
  npcs: { npcs: { role: string; x: number; z: number; obliviousT: number; heading: number }[] };
  quests: { quests: { id: string; objectives: { id: string; done: boolean; count: number }[] }[] };
  runLog: { tally(): Record<string, number> };
  interaction: { carried: { tag?: string } | null; props: { spawn(s: object): unknown; drop(p: unknown, v: object): void; props: { tag?: string }[] } };
};
type Page = import('@playwright/test').Page;
const open = async (page: Page) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=buffet&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
};
const tally = (page: Page) => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.runLog.tally());

test('a bottle dropped on the service bell rings it (the Chef walks over for nobody)', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: -10, y: 10, z: -40, vx: 0, vy: 0, vz: 0, mode: 'air' }); });
  // a bottle falls from the sky onto the bell
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; const b = l.interaction.props.spawn({ type: 'bottle', x: 12, y: 4, z: -26 }); l.interaction.props.drop(b, { x: 0, y: -6, z: 0 }); });
  await expect.poll(async () => (await tally(page))['hit:bell'] ?? 0, { timeout: 120_000, intervals: [1000] }).toBeGreaterThanOrEqual(1);
  await expect.poll(async () => (await tally(page))['arrived:bell:chef'] ?? 0, { timeout: 300_000, intervals: [3000] }).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('the Chef discovers his missing pie with a double take, even if he never saw who took it', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  // he is looking the other way (the bell, say) while the gull takes the pie
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; l.npcs.npcs.find((n) => n.role === 'chef')!.obliviousT = 4; Object.assign(l.gull.state, { x: 0, y: 1.15, z: -19.2, vx: 0, vy: 0, vz: 0, heading: Math.PI, mode: 'air' }); });
  await expect(async () => {
    await page.keyboard.press('KeyE');
    expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.carried?.tag)).toBe('goldenPie');
  }).toPass({ timeout: 60_000, intervals: [700] });
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: -30, y: 14, z: -45, vx: 0, vy: 0, vz: 0, mode: 'air' }); }); // gone, out of sight
  await expect.poll(async () => (await tally(page))['discovered:chef'] ?? 0, { timeout: 200_000, intervals: [2000] }).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});
