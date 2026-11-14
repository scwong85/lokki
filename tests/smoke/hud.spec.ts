import { expect, test } from '@playwright/test';

test('U cycles the HUD: minimal keeps the active quest, off hides the note but shows a timer during a timed quest, and it is saved', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  const cls = () => page.evaluate(() => document.body.className);
  // the first key also starts the audio, which can stall a headless page: press until the mode changes
  const cycleTo = async (want: string) => {
    await expect
      .poll(async () => {
        if (!(await cls()).includes(want)) {
          await page.keyboard.press('KeyU');
          await page.waitForTimeout(500);
        }
        return cls();
      }, { timeout: 20_000 })
      .toContain(want);
  };
  await cycleTo('hud-minimal');
  await expect(page.locator('#todo')).toBeVisible();
  await cycleTo('hud-off');
  await expect(page.locator('#todo')).toBeHidden();
  await expect(page.locator('#heat')).toBeHidden();
  // start the timed ice-cream quest: the small timer appears on its own
  await page.evaluate(() => { const L = (window as unknown as { __lokki: { notes: (n: unknown) => void; quests: { onEvent: (e: string) => unknown } } }).__lokki; L.notes(L.quests.onEvent('alert')); L.notes(L.quests.onEvent('snatch:icecream')); });
  await expect(page.locator('#minitimer')).toBeVisible();
  await expect(page.locator('#minitimer')).toHaveText(/^\d:\d\d$/);
  // saved: still off after a reload
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  expect(await cls()).toContain('hud-off');
  expect(errors).toEqual([]);
});
