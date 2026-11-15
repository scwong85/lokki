import { expect, test } from '@playwright/test';

const ready = (page: import('@playwright/test').Page) => page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });

test('Esc opens the options and closes what is open; options lead to skills and the controls screen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?level=snack-attack&play');
  await ready(page);
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await expect(page.locator('#options')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#options')).toBeHidden();
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await expect(page.locator('#options')).toBeVisible();
  await page.getByRole('button', { name: /Skills & gull looks/ }).click();
  await expect(page.locator('#skills')).toBeVisible();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await expect(page.locator('#skills')).toBeHidden();
  await page.keyboard.press('KeyO');
  await page.getByRole('button', { name: 'Controls…' }).click();
  await expect(page.locator('#controls')).toBeVisible();
  await expect(page.locator('#controls')).toContainText('Grab or drop');
  await expect(page.locator('#controls')).toContainText('Left stick');
  await page.getByRole('button', { name: 'Close' }).last().click();
  await expect(page.locator('#controls')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a controller can drive the menus: D-pad moves, A presses, B goes back', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __pad: { pressed: number[]; polls: number } };
    w.__pad = { pressed: [], polls: 0 };
    navigator.getGamepads = () => (w.__pad.polls++, [
      { axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: w.__pad.pressed.includes(i), value: w.__pad.pressed.includes(i) ? 1 : 0 })), connected: true } as unknown as Gamepad,
      null, null, null,
    ]) as unknown as (Gamepad | null)[];
  });
  await page.goto('/?level=snack-attack&play');
  await ready(page);
  // hold a button for a few real frames (frames are slow in headless Chromium), then let go for a few
  const frames = async (n: number) => {
    const start = await page.evaluate(() => (window as unknown as { __pad: { polls: number } }).__pad.polls);
    await page.waitForFunction((t) => (window as unknown as { __pad: { polls: number } }).__pad.polls >= t, start + n, { timeout: 60_000 });
  };
  const press = async (b: number) => {
    await page.evaluate((i) => ((window as unknown as { __pad: { pressed: number[] } }).__pad.pressed = [i]), b);
    await frames(2);
    await page.evaluate(() => ((window as unknown as { __pad: { pressed: number[] } }).__pad.pressed = []));
    await frames(2);
  };
  await press(9); // Start: options
  await expect(page.locator('#options')).toBeVisible();
  await press(12); // first press shows the highlight
  await expect(page.locator('#options .pad-focus')).toHaveCount(1);
  // walk down to the row with levels, skills and controls, then across to "Controls…" and press A
  const focused = async () => (await page.locator('#options .pad-focus').textContent()) ?? '';
  for (let i = 0; i < 25 && !/Choose a level/.test(await focused()); i++) await press(13);
  for (let i = 0; i < 4 && !/Controls/.test(await focused()); i++) await press(15); // across: Skills, then Controls…
  await expect(page.locator('#options .pad-focus')).toContainText('Controls');
  await press(0);
  await expect(page.locator('#controls')).toBeVisible();
  await press(1); // B: back
  await expect(page.locator('#controls')).toBeHidden();
});

test('touch: left-handed mirrors the buttons, arranging moves one and it is remembered', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/?touch&level=snack-attack&play');
  await ready(page);
  const flap = () => page.locator('.t-flap').boundingBox();
  const right = (await flap())!;
  expect(right.x).toBeGreaterThan(844 / 2);
  await page.evaluate(() => localStorage.removeItem('lokki.touchlayout'));
  // left-handed through the saved option
  await page.keyboard.press('KeyO');
  await page.locator('input[data-k=lefty]').check();
  await expect.poll(async () => (await flap())!.x).toBeLessThan(844 / 2);
  await page.locator('input[data-k=lefty]').uncheck();
  // arrange: drag FLAP up-left
  await page.getByRole('button', { name: /Arrange the touch buttons/ }).click();
  await expect(page.locator('.t-arrange')).toBeVisible();
  const f = (await flap())!;
  await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2);
  await page.mouse.down();
  await page.mouse.move(600, 150, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Done' }).click();
  const moved = (await flap())!;
  expect(Math.abs(moved.x + moved.width / 2 - 600)).toBeLessThan(6);
  expect(await page.evaluate(() => localStorage.getItem('lokki.touchlayout'))).toContain('Space');
});
