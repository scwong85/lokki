import { expect, test } from '@playwright/test';

/** Map sabotage in stage 1.1: even an angry tourist who is chasing the thief walks to the wrong ferry once the map is in the harbour. */
test('map sabotage: drop it in the sea and the chasing tourist heads for the wrong ferry (quest won)', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=a1s1&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  type Lk = { gull: { state: Record<string, unknown> }; npcs: { npcs: { x: number; z: number; mood: string; mode: string; holdType: string | null; goal: { name: string } | null }[]; snatchCandidates: (b: unknown) => unknown[] }; interaction: { updateGull: (...a: unknown[]) => { type: string }[] }; quests: { onEvent: (e: string) => unknown; quests: { id: string; status: string }[] } };
  const lk = (): Lk => (window as unknown as { __lokki: Lk }).__lokki;
  // snatch the map (a dive at the tourist's hand), the quest starts
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; const n = l.npcs.npcs.find((m) => m.holdType === 'map')!; Object.assign(l.gull.state, { x: n.x, y: 1.2, z: n.z + 0.4, vx: 0, vy: 0, vz: 0, mode: 'dive' }); l.interaction.updateGull(0, l.gull.state, { grab: false, grabHeld: false, toss: false, poop: false }, 1 / 60, 0); l.quests.onEvent('snatch:map'); });
  void lk;
  // he is angry and chasing, right by the quay
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; const n = l.npcs.npcs.find((m) => m.mood === 'angry')!; n.x = 4; n.z = -12; n.mode = 'chase'; });
  // let go of the map over the harbour
  for (let k = 0; k < 30; k++) {
    const dropped = await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: 2, y: 4, z: 3, vx: 0, vy: 0, vz: 0, mode: 'air' }); return l.interaction.updateGull(0, l.gull.state, { grab: true, grabHeld: false, toss: false, poop: false }, 1 / 60, 5).some((e) => e.type === 'drop'); });
    if (dropped) break;
    await page.waitForTimeout(300);
  }
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.quests.quests.find((q) => q.id === 'map')!.status), { timeout: 120_000, intervals: [1000] }).toBe('won');
  expect(errors).toEqual([]);
});
