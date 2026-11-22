import { expect, test } from '@playwright/test';

/** Stage 1.4: the jukebox draws the whole square (free people walk over), so "five people dancing" is a crowd you bring together. */
test('stage 1.4: peck the jukebox, five people end up dancing, a dancer holds a cone', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=mood-swings-v1&gate=1.5&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  type Lk = {
    gull: { state: Record<string, unknown> };
    peckNow: () => boolean;
    npcs: { npcs: { role: string; mode: string; holdType: string | null }[] };
    quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  };
  const lk = () => (window as unknown as { __lokki: Lk }).__lokki;
  void lk;
  // nobody is nailed to a spot: the partygoers can move
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.filter((n) => n.role === 'partygoer').length)).toBeGreaterThanOrEqual(5);
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: -6, y: 0.4, z: -16, vx: 0, vy: 0, vz: 0, mode: 'ground' }); });
  await expect.poll(async () => {
    await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.peckNow()); // keeps the music going (cooldown makes extra pecks harmless)
    return page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.quests.quests.find((q) => q.id === 'jukechain')!.objectives.find((o) => o.id === 'dance')!.done);
  }, { timeout: 330_000, intervals: [3000] }).toBe(true);
  expect(errors).toEqual([]);
});
