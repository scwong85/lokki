import { expect, test } from '@playwright/test';

/** Three different reactions in a row: the game notices, logs the chain and logs it. */
test('a chain reaction is recognised from real game events', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=a1s2&gate=1.5&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  type Lk = { quests: { onEvent(e: string): unknown }; runLog: { tally(): Record<string, number> } };
  await page.evaluate(() => {
    const l = (window as unknown as { __lokki: Lk }).__lokki;
    l.quests.onEvent('tipChair');
    l.quests.onEvent('yuck');
    l.quests.onEvent('soaked');
  });
  const tally = await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.runLog.tally());
  expect(tally['chain:3']).toBe(1);
  expect(errors).toEqual([]);
});
