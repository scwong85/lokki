import { expect, test } from '@playwright/test';

test('loads, renders a canvas, no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1000);
  await page.keyboard.up('KeyW');
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({ path: 'tests/__screenshots__/m0.png' });
  expect(errors).toEqual([]);
});
