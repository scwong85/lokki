import { expect, test } from '@playwright/test';

type Lk = { cam: { camera: { fov: number } } };

test('comfort and handling options apply, are saved, and the vignette exists', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { if (!localStorage.getItem('lokki-options-v1')) localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })); });
  await page.goto('/?play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  expect(await page.locator('#comfort-vignette').count()).toBe(1);
  await page.keyboard.press('KeyO');
  await expect(page.locator('#options')).toBeVisible();
  // every new control is there
  for (const sel of ['select[data-k=comfort]', 'select[data-k=camFollow]', 'input[data-k=smoothSteer]', 'input[data-k=invertY]', 'input[data-k=fov]', 'input[data-k=camDistance]']) await expect(page.locator(sel), sel).toHaveCount(1);
  await expect(page.locator('select[data-k=camFollow]')).toHaveValue('gentle'); // the default
  await expect(page.locator('input[data-k=smoothSteer]')).toBeChecked();
  // field of view takes effect on the camera
  await page.locator('input[data-k=fov]').evaluate((el) => { (el as HTMLInputElement).value = '90'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.cam.camera.fov), { timeout: 20_000 }).toBeGreaterThan(85);
  await page.locator('select[data-k=comfort]').selectOption('calm');
  await page.locator('input[data-k=invertY]').check();
  // saved: still there after a reload
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  await page.keyboard.press('KeyO');
  await expect(page.locator('select[data-k=comfort]')).toHaveValue('calm');
  await expect(page.locator('input[data-k=invertY]')).toBeChecked();
  await expect(page.locator('input[data-k=fov]')).toHaveValue('90');
  expect(errors).toEqual([]);
});
