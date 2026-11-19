import { expect, test } from '@playwright/test';

/** Block Party: a pecked boom box draws free people over to dance; the quest steps tick on real triggers. */
test('block party: peck the boom box, the crowd comes and dances, the chain advances', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=block-party&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  type Lk = {
    gull: { state: Record<string, unknown> };
    npcs: { npcs: { role: string; x: number; z: number; mode: string }[]; musicPlaying: boolean };
    interaction: { props: { props: { type: string; cur: { p: { x: number; y: number; z: number } } }[] }; pressE?: () => void };
    quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  };
  const box = await page.evaluate(() => {
    const l = (window as unknown as { __lokki: Lk }).__lokki;
    const p = l.interaction.props.props.find((q) => q.type === 'boombox')!;
    Object.assign(l.gull.state, { x: p.cur.p.x + 1.2, y: 0.3, z: p.cur.p.z, vx: 0, vy: 0, vz: 0, heading: Math.PI / 2, mode: 'ground' });
    return p.cur.p;
  });
  expect(box).toBeTruthy();
  // E on a too-heavy boom box pecks it (no Fat bird yet)
  await expect(async () => {
    await page.keyboard.press('KeyE');
    expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.musicPlaying)).toBe(true);
  }).toPass({ timeout: 30_000, intervals: [500] });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.quests.quests.find((q) => q.id === 'partychain')!.objectives[0].done), { timeout: 10_000 }).toBe(true);
  // people walk over and dance
  await expect.poll(async () => {
    await page.keyboard.press('KeyE'); // keep the music going (the software renderer runs the sim slowly)
    return page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.filter((n) => n.mode === 'dance').length);
  }, { timeout: 200_000, intervals: [2000] }).toBeGreaterThanOrEqual(3);
  expect(errors).toEqual([]);
});
