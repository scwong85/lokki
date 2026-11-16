import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  notes: (n: unknown) => void;
  noise: (x: number, z: number, loud: number) => void;
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean; count: number }[] }[]; onEvent: (e: string) => unknown };
  kalle: { score: number; mode: string } | null;
  defense: { response: { deployed: Set<string> }; vendors: { mode: string }[]; drone: { battery: number; mode: string } | null; heat: { value: number } } | null;
  interaction: { props: { props: { type: string; tag?: string }[] } };
};
type Ask = <T>(fn: (l: Lk, a?: unknown) => T, arg?: unknown) => Promise<Awaited<T>>;
const lk = (p: Page): Ask => (fn, arg) => p.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as never;
const open = async (page: Page, level: string) => {
  await page.goto(`/?level=${level}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return lk(page);
};

test('level 19: Kalle flies off to take a free snack', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'the-rival');
  expect(await L((l) => l.kalle !== null)).toBe(true);
  await expect.poll(() => L((l) => l.kalle!.score), { timeout: 300_000 }).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('level 20: the vendors sleep until a noise wakes one', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'night-market');
  expect(await L((l) => l.defense!.vendors.every((v) => v.mode === 'asleep'))).toBe(true);
  await L((l) => l.noise(0, -33, 1.4));
  await expect.poll(() => L((l) => l.quests.quests.find((q) => q.id === 'alarm')!.objectives[0].done), { timeout: 120_000 }).toBe(true);
});

test('level 21: the drone hunts, and when its battery is gone it lands and leaves a battery to steal', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'the-drone');
  expect(await L((l) => l.defense!.drone !== null)).toBe(true);
  await L((l) => {
    l.defense!.drone!.battery = 0.3;
    return 0;
  });
  await expect.poll(() => L((l) => l.interaction.props.props.some((p) => p.tag === 'droneBattery')), { timeout: 120_000 }).toBe(true);
});

test('level 22: the finale is open from the start with the city at full alert', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'grand-finale');
  expect([...(await L((l) => [...l.defense!.response.deployed]))].sort()).toEqual(['lines', 'nets', 'vendors', 'warden']);
  expect(await L((l) => l.quests.quests.find((q) => q.id === 'finale')!.status)).toBe('idle'); // unlocked: starts when the horn rings
  expect(await L((l) => l.defense!.heat.value)).toBeGreaterThanOrEqual(60);
});

test('level 20: clearing Night Market offers The Drone, and Enter goes there', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'night-market');
  await L((l) => { for (const e of ['grab:nightA', 'grab:nightB', 'grab:nightC', 'poopVendor']) l.notes(l.quests.onEvent(e)); });
  await expect(page.locator('#levelcomplete')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#levelcomplete')).toContainText('The Drone');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: { level: string } }).__lokki.level), { timeout: 60_000 }).toBe('the-drone');
});
