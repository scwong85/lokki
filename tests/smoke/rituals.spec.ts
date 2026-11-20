import { expect, test } from '@playwright/test';

type Lk = { npcs: { npcs: { role: string; ritualLabel?: string }[] }; runLog: { tally(): Record<string, number> } };

test('the Chef counts down and tastes his cooking with his eyes shut (a ritual you can see coming)', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=buffet&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  const seen = new Set<string>();
  await expect.poll(async () => {
    const lbl = await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.find((n) => n.role === 'chef')!.ritualLabel ?? '-');
    seen.add(lbl);
    return (await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.runLog.tally()['ritual:chef'] ?? 0));
  }, { timeout: 240_000, intervals: [400] }).toBeGreaterThanOrEqual(1);
  expect([...seen].some((s) => s === '😋' || /^[123]$/.test(s))).toBe(true);
  expect(errors).toEqual([]);
});
