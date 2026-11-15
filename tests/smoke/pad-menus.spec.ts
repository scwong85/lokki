import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = { restartLevel?: never; level: string; notes: (n: unknown) => void; quests: { onEvent: (e: string) => unknown; tick: (c: unknown) => unknown } };

const ready = (page: Page) => page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });

/** A fake controller whose presses are held for a few real frames (frames are slow in headless Chromium). */
async function fakePad(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __pad: { pressed: number[]; polls: number } };
    w.__pad = { pressed: [], polls: 0 };
    navigator.getGamepads = () =>
      (w.__pad.polls++,
      [{ axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: w.__pad.pressed.includes(i), value: w.__pad.pressed.includes(i) ? 1 : 0 })), connected: true }, null, null, null]) as unknown as (Gamepad | null)[];
  });
  const frames = async (n: number) => {
    const start = await page.evaluate(() => (window as unknown as { __pad: { polls: number } }).__pad.polls);
    await page.waitForFunction((t) => (window as unknown as { __pad: { polls: number } }).__pad.polls >= t, start + n, { timeout: 60_000 });
  };
  return async (b: number) => {
    await page.evaluate((i) => ((window as unknown as { __pad: { pressed: number[] } }).__pad.pressed = [i]), b);
    await frames(2);
    await page.evaluate(() => ((window as unknown as { __pad: { pressed: number[] } }).__pad.pressed = []));
    await frames(2);
  };
}

test('controller: the level-complete card can be answered with A (next level) or B (keep playing)', async ({ page }) => {
  test.setTimeout(300_000);
  const press = await fakePad(page);
  await page.goto('/?level=snack-attack&play');
  await ready(page);
  const clear = () =>
    page.evaluate(() => {
      const x = (window as unknown as { __lokki: Lk }).__lokki;
      x.notes(x.quests.onEvent('snatch:icecream'));
      for (let i = 0; i < 400; i++) x.notes(x.quests.tick({ dt: 1 / 60, carryingStolen: true, nearestNpc: 99 }));
      x.notes(x.quests.onEvent('feast'));
    });
  await clear();
  await expect(page.locator('#levelcomplete')).toBeVisible();
  await press(1); // B: keep playing
  await expect(page.locator('#levelcomplete')).toBeHidden();
  await page.evaluate(() => (window as unknown as { __lokki: { restartLevel: (m: string) => void } }).__lokki.restartLevel('normal'));
  await clear();
  await expect(page.locator('#levelcomplete')).toBeVisible();
  await press(0); // A: the next level
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.level), { timeout: 60_000 }).toBe('bombs-away');
  await expect(page.locator('#levelcomplete')).toBeHidden();
});

test('controller: the level drop-down in the co-op lobby can be changed with the D-pad', async ({ page }) => {
  test.setTimeout(300_000);
  const press = await fakePad(page);
  await page.goto('/?level=snack-attack&play');
  await ready(page);
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyN');
  await expect(page.locator('#lobby')).toBeVisible();
  const select = page.locator('#lb-level');
  const before = await select.inputValue();
  // highlight the first thing, walk down to the drop-down
  await press(12);
  for (let i = 0; i < 6 && !(await select.evaluate((e) => e.classList.contains('pad-focus'))); i++) await press(13);
  await expect(select).toHaveClass(/pad-focus/);
  await press(15); // right: the next level in the list
  await expect.poll(() => select.inputValue()).not.toBe(before);
  await press(14); // left: back
  await expect.poll(() => select.inputValue()).toBe(before);
});
