import { expect, test } from '@playwright/test';

type Lokki = {
  gull: { state: Record<string, unknown> };
  cam: { yaw: number; pitch: number };
  interaction: { carried: { def: { name: string } } | null; props: { props: { tag?: string; type: string; body: { translation: () => { x: number; y: number; z: number } } }[] } };
  quests: { quests: { id: string; status: string; objectives: { done: boolean }[] }[]; onEvent: (e: string) => unknown };
  notes: (n: unknown) => void;
};
const L = () => (window as unknown as { __lokki: Lokki }).__lokki; // (node-side typing helper; the page gets its own L via addInitScript)

async function boot(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // page functions are serialised, so the helper L() must exist inside the page too
  await page.addInitScript(() => {
    (window as unknown as { L: () => unknown }).L = () => (window as unknown as { __lokki: unknown }).__lokki;
  });
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  return errors;
}

test('cap heist: take the statue cap and drop it on the ferry', async ({ page }) => {
  const errors = await boot(page);
  const cap = await page.evaluate(() => { const c = L().interaction.props.props.find((p) => p.tag === 'statueCap')!; return c.body.translation(); });
  // stand next to the cap on the statue and take it (E), retrying until the quest starts
  await page.waitForFunction(
    ([c]) => {
      const { gull, quests } = L();
      if (quests.quests.find((q) => q.id === 'cap')!.status === 'active') return true;
      Object.assign(gull.state, { x: c.x, y: c.y + 0.6, z: c.z + 0.9, vx: 0, vy: 0, vz: 0, heading: Math.PI, mode: 'ground', stunT: 0 });
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
      return false;
    },
    [cap],
    { timeout: 30_000, polling: 150 },
  );
  // fly above the ferry's upper cabin and let go (E) until it lands there
  await page.waitForFunction(
    () => {
      const { gull, quests, interaction } = L();
      if (quests.quests.find((q) => q.id === 'cap')!.status === 'won') return true;
      if (interaction.carried) Object.assign(gull.state, { x: -5, y: 11, z: 7, vx: 0, vy: 0, vz: 0, mode: 'air', stunT: 0 });
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
      return false;
    },
    null,
    { timeout: 40_000, polling: 400 },
  );
  expect(errors).toEqual([]);
});

test('the finale unlocks after the seven quests, starts on the ferry cabin roof, and ends with the level-complete screen', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = await boot(page);
  expect(await page.evaluate(() => L().quests.quests.find((q) => q.id === 'finale')!.status)).toBe('locked');
  await page.evaluate(() => {
    const { quests, notes } = L();
    const events = ['alert', 'snatch:icecream', 'snatch:candy', 'tookItem:salmiakki', 'yuck', 'grab:statueCap', 'capDelivered', 'grab:bun', 'bun1', 'bun2', 'bun3', 'snatch:map', 'mapInSea', 'wrongFerry', 'snatch:flowers', 'poopNpc:dater', 'dateOver', 'grab:toy', 'tookItem:toy'];
    for (const e of events) notes(quests.onEvent(e));
  });
  // the ice-cream escape needs time: run its tick through the quest log
  await page.evaluate(() => {
    const w = window as unknown as { __lokki: { quests: { tick: (c: unknown) => unknown }; notes: (n: unknown) => void } };
    for (let i = 0; i < 400; i++) w.__lokki.notes(w.__lokki.quests.tick({ dt: 1 / 60, carryingStolen: true, nearestNpc: 99 }));
  });
  expect(await page.evaluate(() => L().quests.quests.find((q) => q.id === 'finale')!.status)).toBe('idle');
  // land on the ferry cabin roof: the horn starts the finale
  await page.waitForFunction(
    () => {
      const { gull, quests } = L();
      if (quests.quests.find((q) => q.id === 'finale')!.status === 'active') return true;
      Object.assign(gull.state, { x: -5, y: 9.6, z: 7, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'ground', stunT: 0 });
      return false;
    },
    null,
    { timeout: 120_000, polling: 1500 },
  );
  await page.evaluate(() => {
    const { quests, notes } = L();
    for (const e of ['tipChair', 'tipChair', 'tipChair', 'grab:stallBun', 'poopWarden']) notes(quests.onEvent(e));
  });
  await expect(page.locator('#levelcomplete')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#levelcomplete')).toBeHidden();
  expect(errors).toEqual([]);
});
