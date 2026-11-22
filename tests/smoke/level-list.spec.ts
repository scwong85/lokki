import { expect, test } from '@playwright/test';

test('the title list shows the stages and one Playground button; the old levels open behind it', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?title');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  const list = page.locator('#title .title-levels');
  await expect(list.locator('[data-playground="playground"]')).toBeVisible({ timeout: 30_000 });
  expect(await list.locator('[data-level]').count()).toBeLessThan(14);
  await list.locator('[data-playground="playground"]').click();
  expect(await list.locator('[data-level]').count()).toBeGreaterThan(30);
  await expect(list.locator('[data-playground="main"]')).toBeVisible();
  await page.screenshot({ path: 'tests/__screenshots__/level-list-playground.png' });
  await list.locator('[data-playground="main"]').click();
  await expect(list.locator('[data-playground="playground"]')).toBeVisible();
  expect(errors).toEqual([]);
});
