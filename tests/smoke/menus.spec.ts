import { expect, test } from '@playwright/test';

type Lk = { gull: { state: { x: number; z: number } } };
const pos = (page: import('@playwright/test').Page) => page.evaluate(() => { const g = (window as unknown as { __lokki: Lk }).__lokki.gull.state; return { x: g.x, z: g.z }; });

test('title screen pauses the game, Enter starts it, tips guide the first moves, options pause and persist', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/?title');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await expect(page.locator('#boot')).toHaveCount(0, { timeout: 5000 }); // loading screen is gone
  await expect(page.locator('#title')).toBeVisible();
  const before = await pos(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  expect(await pos(page)).toEqual(before); // nothing moves behind the title
  await page.keyboard.press('Enter');
  await expect(page.locator('#title')).toBeHidden();
  await expect(page.locator('#tip')).toContainText('Waddle');
  await page.keyboard.down('KeyW');
  await expect(page.locator('#tip')).toContainText('Take off', { timeout: 5000 });
  await page.keyboard.up('KeyW');
  // options: opens with O, pauses, persists a changed slider across a reload
  await page.keyboard.press('KeyO');
  await expect(page.locator('#options')).toBeVisible();
  await page.locator('#options input[data-k=music]').fill('0.2');
  await page.keyboard.press('KeyO');
  await expect(page.locator('#options')).toBeHidden();
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await page.keyboard.press('Enter');
  await page.keyboard.press('KeyO');
  await expect(page.locator('#options input[data-k=music]')).toHaveValue('0.2');
  expect(errors).toEqual([]);
});
