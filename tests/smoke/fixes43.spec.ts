import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Prop = { id: number; type: string; heldBy: number | null };
type Npc = { id: number; role: string; holding: number | null };
type Lk = {
  ringBell: () => void;
  npcs: { npcs: Npc[]; items: Map<number, Prop> };
  interaction: { props: { props: Prop[]; detach?: (p: Prop) => void } };
};
const L = (page: Page) => <T>(fn: (l: Lk) => T) =>
  page.evaluate((src) => new Function('l', `return (${src})(l)`)((window as unknown as { __lokki: Lk }).__lokki), fn.toString()) as Promise<Awaited<T>>;

test('bell heist: a sandwich taken while the bell is quiet is replaced when the bell rings', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?level=ding-dong&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  const l = L(page);
  const before = await l((x) => x.npcs.npcs.filter((n) => n.role === 'picnic').map((n) => n.holding !== null));
  expect(before).toEqual([true, true]);
  // a picnicker loses his sandwich out of turn
  await l((x) => {
    const n = x.npcs.npcs.find((m) => m.role === 'picnic')!;
    const prop = x.interaction.props.props.find((p) => p.id === n.holding)!;
    prop.heldBy = null;
    n.holding = null;
    return 0;
  });
  expect(await l((x) => x.npcs.npcs.filter((n) => n.role === 'picnic').map((n) => n.holding !== null))).toEqual([false, true]);
  await l((x) => { x.ringBell(); return 0; });
  expect(await l((x) => x.npcs.npcs.filter((n) => n.role === 'picnic').map((n) => n.holding !== null))).toEqual([true, true]);
  expect(errors).toEqual([]);
});

test('the title screen level list scrolls (and opts back in to touch scrolling), and the last level can be reached', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/?title');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  const list = page.locator('.title-levels');
  await expect(list).toBeVisible();
  const m = await list.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight, ta: getComputedStyle(el).touchAction, oy: getComputedStyle(el).overflowY }));
  expect(m.sh).toBeGreaterThan(m.ch); // more levels than fit
  expect(m.oy).toBe('auto');
  expect(m.ta).toBe('pan-y'); // body.touch sets none; the list opts back in
  expect(await page.locator('.title-levels h4').count()).toBeGreaterThanOrEqual(3);
  await list.evaluate((el) => (el.scrollTop = el.scrollHeight));
  expect(await list.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
  await expect(page.locator('.title-levels button').last()).toBeInViewport();
});

test('holding T taunts even in a new profile (the tips used to swallow it), and Y skips the tips', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: false })));
  await page.goto('/?level=map-and-cone&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  const taunting = () => page.evaluate(() => (window as unknown as { __lokki: { gull: { taunting: boolean } } }).__lokki.gull.taunting);
  await page.keyboard.down('KeyT');
  await expect.poll(taunting, { timeout: 20_000 }).toBe(true);
  await page.keyboard.up('KeyT');
  await expect.poll(taunting, { timeout: 20_000 }).toBe(false);
});
