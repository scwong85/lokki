import { expect, test } from '@playwright/test';

type Lk = {
  havoc: { started: boolean; done: boolean; score: number; chain: { mult: number }; start: () => void; update: (dt: number) => void } | null;
  quests: { onEvent: (e: string) => unknown };
  runLog: { count: (k: string) => number };
};
const lk = (p: import('@playwright/test').Page) => <T>(fn: (l: Lk) => T) =>
  p.evaluate((src) => new Function('l', `return (${src})(l)`)((window as unknown as { __lokki: Lk }).__lokki), fn.toString()) as Promise<Awaited<T>>;

test('Havoc Hour: events score and chain, the run ends on the clock and shows the results card', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?level=havoc-hour&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  const L = lk(page);
  await expect(page.locator('#havoc')).toBeVisible();
  expect(await L((l) => l.havoc !== null)).toBe(true);
  await L((l) => { l.havoc!.start(); l.quests.onEvent('snatch'); l.quests.onEvent('poopNpc'); l.quests.onEvent('photobomb'); });
  expect(await L((l) => l.havoc!.chain.mult)).toBe(3);
  expect(await L((l) => l.havoc!.score)).toBe(100 + 160 + 450);
  expect(await L((l) => l.runLog.count('snatch'))).toBe(1);
  await expect(page.locator('#havoc .hv-score')).toContainText('710');
  // jump the clock to the end: the results card appears
  await L((l) => l.havoc!.update(9999));
  await expect(page.locator('#havoccard')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#havoccard .hv-big')).toContainText('710');
  expect(errors).toEqual([]);
});
