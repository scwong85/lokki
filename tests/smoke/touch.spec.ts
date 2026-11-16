import { expect, test } from '@playwright/test';

type S = { x: number; z: number; y: number; mode: string };
const gull = (page: import('@playwright/test').Page) => page.evaluate(() => ({ ...(window as unknown as { __lokki: { gull: { state: S } } }).__lokki.gull.state }));

test('touch controls: the stick walks, FLAP takes off, the menu opens panels that can be closed by tapping', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/?touch');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await expect(page.locator('#touch')).toBeVisible();
  await expect(page.locator('#hud .keys')).toBeHidden();
  await page.waitForTimeout(800);

  // left thumb: press and push the stick forward
  const before = await gull(page);
  await page.mouse.move(150, 260);
  await page.mouse.down();
  await page.mouse.move(150, 200, { steps: 4 });
  await expect.poll(async () => { const g = await gull(page); return Math.hypot(g.x - before.x, g.z - before.z); }, { timeout: 15_000 }).toBeGreaterThan(1.5);
  await page.mouse.up();

  // FLAP held -> airborne
  const fb = (await page.locator('.t-flap').boundingBox())!;
  await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
  await page.mouse.down();
  await expect.poll(async () => (await gull(page)).mode, { timeout: 15_000 }).toBe('air');
  await page.mouse.up();

  // ☰ -> Skills -> Close
  await page.locator('.t-menu').click();
  await expect(page.locator('.t-menupanel')).toBeVisible();
  await page.locator('[data-menu=KeyK]').click();
  await expect(page.locator('#skills')).toBeVisible({ timeout: 10_000 });
  await page.locator('#skills .sk-close').click();
  await expect(page.locator('#skills')).toBeHidden();
  expect(errors).toEqual([]);
});

test('touch controls: Taunt and Emote buttons appear only with a partner, and an emote pops a bubble', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/?touch');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await page.waitForTimeout(800);
  await expect(page.locator('.t-taunt')).toBeHidden(); // single player: no partner to taunt for
  await expect(page.locator('.t-emote')).toBeHidden();

  const co = await page.context().newPage();
  await co.setViewportSize({ width: 844, height: 390 });
  co.on('pageerror', (e) => errors.push(e.message));
  await co.goto('/?touch&coop');
  await co.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await expect(co.locator('.t-taunt')).toBeVisible({ timeout: 20_000 });
  await expect(co.locator('.t-emote')).toBeVisible();
  const eb = (await co.locator('.t-emote').boundingBox())!;
  await co.mouse.move(eb.x + eb.width / 2, eb.y + eb.height / 2);
  await co.mouse.down();
  await co.mouse.up();
  await expect.poll(() => co.evaluate(() => (window as unknown as { __lokki: { emotes: { active: number } } }).__lokki.emotes.active), { timeout: 30_000 }).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
