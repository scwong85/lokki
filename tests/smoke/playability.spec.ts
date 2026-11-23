import { expect, test } from '@playwright/test';

type Lk = { tuning: { hints: { compassAfter: { value: number } } }; gull: { state: Record<string, unknown> } };
const lk = (page: import('@playwright/test').Page) => <T>(fn: string) => page.evaluate(`(() => { const l = window.__lokki; return ${fn}; })()`) as Promise<T>;

test('playability (M120): the waits line counts down to the ferry, the row compass points when stuck', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?level=a1s1&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  const l = lk(page);
  // the ferry wait
  await expect(page.locator('#waits')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#waits')).toContainText('ferry');
  // the compass: stuck for a moment (short for the test), a marker labelled "???" shows up
  await l<number>('(l.tuning.hints.compassAfter.value = 3, 0)');
  await expect(page.locator('#waypoints')).toContainText('???', { timeout: 60_000 });
  await page.screenshot({ path: 'tests/__screenshots__/playability.png' });
  expect(errors).toEqual([]);
  void ({} as Lk);
});
