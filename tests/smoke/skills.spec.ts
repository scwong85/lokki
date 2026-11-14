import { expect, test } from '@playwright/test';

async function boot(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => {
    (window as unknown as { L: () => unknown }).L = () => (window as unknown as { __lokki: unknown }).__lokki;
  });
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  return errors;
}

type Q = { quests: { id: string; status: string }[]; onEvent: (e: string) => unknown };
type Lk = { notes: (n: unknown) => void; quests: Q; skills: { ids: string[] }; saveData: () => Record<string, unknown>; runTimer: { mode: string } };
const ev = (page: import('@playwright/test').Page, events: string[]) =>
  page.evaluate((es) => { const l = (window as unknown as { L: () => Lk }).L(); for (const e of es) l.notes(l.quests.onEvent(e)); }, events);

test('winning a quest unlocks its skill, it is saved and survives a reload', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as unknown as { L: () => Lk }).L().skills.ids)).toEqual([]);
  await ev(page, ['snatch:candy', 'tookItem:salmiakki', 'yuck']);
  await expect.poll(() => page.evaluate(() => (window as unknown as { L: () => Lk }).L().skills.ids)).toContain('mimic');
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  const after = await page.evaluate(() => { const l = (window as unknown as { L: () => Lk }).L(); return { skills: l.skills.ids, won: l.quests.quests.filter((q) => q.status === 'won').map((q) => q.id) }; });
  expect(after.skills).toContain('mimic');
  expect(after.won).toContain('swap');
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyK');
  await expect(page.locator('#skills')).toBeVisible();
  expect(errors).toEqual([]);
});

test('clearing the finale unlocks extras (X) and speedrun (Z)', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  // locked before the first clear
  await page.keyboard.press('KeyZ');
  expect(await page.evaluate(() => (window as unknown as { L: () => Lk }).L().runTimer.mode)).toBe('normal');
  await ev(page, ['alert', 'snatch:icecream']);
  await page.evaluate(() => { const l = (window as unknown as { L: () => Lk & { quests: { tick: (c: unknown) => unknown } } }).L(); for (let i = 0; i < 400; i++) l.notes(l.quests.tick({ dt: 1 / 60, carryingStolen: true, nearestNpc: 99 })); });
  await ev(page, ['snatch:candy', 'tookItem:salmiakki', 'yuck', 'grab:statueCap', 'capDelivered', 'grab:bun', 'bun1', 'bun2', 'bun3', 'snatch:map', 'mapInSea', 'wrongFerry', 'snatch:flowers', 'poopNpc:dater', 'dateOver', 'grab:toy', 'tookItem:toy']);
  await ev(page, ['finaleStart', 'tipChair', 'tipChair', 'tipChair', 'grab:stallBun', 'poopWarden']);
  await expect(page.locator('.lc-card')).toBeVisible();
  await expect(page.locator('.lc-note', { hasText: 'Unlocked' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { L: () => Lk }).L().saveData().replayUnlocked)).toBe(true);
  await page.keyboard.press('Enter');
  await page.keyboard.press('KeyZ');
  await expect.poll(() => page.evaluate(() => (window as unknown as { L: () => Lk }).L().runTimer.mode)).toBe('speedrun');
  await page.keyboard.press('KeyR');
  await expect.poll(() => page.evaluate(() => (window as unknown as { L: () => Lk }).L().runTimer.mode)).toBe('normal');
  // skills are kept across restarts
  expect((await page.evaluate(() => (window as unknown as { L: () => Lk }).L().skills.ids)).length).toBeGreaterThan(5);
  await page.keyboard.press('KeyX');
  await expect.poll(() => page.evaluate(() => (window as unknown as { L: () => Lk }).L().quests.quests.find((q) => q.id === 'bonus')!.status)).not.toBe('locked');
  expect(errors).toEqual([]);
});

test('the finale restocks chairs and pastry that were moved before the horn', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await ev(page, ['alert', 'snatch:icecream']);
  await page.evaluate(() => { const l = (window as unknown as { L: () => Lk & { quests: { tick: (c: unknown) => unknown } } }).L(); for (let i = 0; i < 400; i++) l.notes(l.quests.tick({ dt: 1 / 60, carryingStolen: true, nearestNpc: 99 })); });
  await ev(page, ['snatch:candy', 'tookItem:salmiakki', 'yuck', 'grab:statueCap', 'capDelivered', 'grab:bun', 'bun1', 'bun2', 'bun3', 'snatch:map', 'mapInSea', 'wrongFerry', 'snatch:flowers', 'poopNpc:dater', 'dateOver', 'grab:toy', 'tookItem:toy']);
  // knock the chairs away and carry the pastry off
  await page.evaluate(() => {
    const l = (window as unknown as { __lokki: { interaction: { props: { props: { type: string; tag?: string; body: { setTranslation: (v: object, w: boolean) => void } }[] } } } }).__lokki;
    for (const p of l.interaction.props.props) if (p.type === 'chair' || p.tag === 'stallBun') p.body.setTranslation({ x: 200, y: 5, z: 200 }, true);
  });
  await ev(page, ['finaleStart']);
  const away = await page.evaluate(() => {
    const l = (window as unknown as { __lokki: { interaction: { props: { props: { type: string; tag?: string; spawn: { x: number; z: number }; body: { translation: () => { x: number; z: number } } }[] } } } }).__lokki;
    return l.interaction.props.props.filter((p) => p.type === 'chair' || p.tag === 'stallBun').filter((p) => Math.hypot(p.body.translation().x - p.spawn.x, p.body.translation().z - p.spawn.z) > 3).length;
  });
  expect(away).toBe(0);
  expect(errors).toEqual([]);
});

test('gull looks: locked ones cannot be worn, earned ones can, and the choice is saved', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  // the first key press also starts the audio, which can stall a headless page for a moment: press until it shows
  const panel = async (open: boolean) => {
    await expect
      .poll(async () => {
        if ((await page.locator('#skills').isVisible()) !== open) {
          await page.keyboard.press('KeyK');
          await page.waitForTimeout(500);
        }
        return page.locator('#skills').isVisible();
      }, { timeout: 20_000 })
      .toBe(open);
  };
  await panel(true);
  await expect(page.locator('[data-skin=juvenile]')).toHaveClass(/locked/);
  await page.keyboard.press('Digit2'); // locked: nothing happens
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as unknown as { L: () => Lk }).L().saveData().skin)).toBe('herring');
  await panel(false);
  // earn three skills (salmiakki swap, cap heist, lost teddy) -> the juvenile look unlocks
  await ev(page, ['snatch:candy', 'tookItem:salmiakki', 'yuck', 'grab:statueCap', 'capDelivered', 'grab:toy', 'tookItem:toy']);
  await expect.poll(() => page.evaluate(() => (window as unknown as { L: () => Lk }).L().skills.ids.length)).toBe(3);
  await panel(true);
  await expect(page.locator('[data-skin=juvenile]')).not.toHaveClass(/locked/);
  await page.locator('[data-skin=juvenile]').click();
  await expect(page.locator('[data-skin=juvenile]')).toHaveClass(/on/);
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as unknown as { L: () => Lk }).L().saveData().skin)).toBe('juvenile');
  expect(errors).toEqual([]);
});
