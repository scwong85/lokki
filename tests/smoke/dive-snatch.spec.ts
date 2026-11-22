import { expect, test } from '@playwright/test';

/** A fast dive at somebody's hand snatches the item: it must not bowl them over and drop it on the floor instead. */
test('a fast dive at a held map snatches it (no knock-down)', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=first-light-v1&gate=1.5&play'); // slam is unlocked by the gate
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  type Lk = { gull: { state: Record<string, unknown> }; npcs: { npcs: { role: string; x: number; z: number; handAngle: number; mode: string; holding: number | null }[] }; interaction: { carried: { type: string } | null } };
  // a queue person holds an ice cream: dive at the hand at speed
  await page.evaluate(() => {
    const l = (window as unknown as { __lokki: Lk }).__lokki;
    const n = l.npcs.npcs.find((m) => m.role === 'tourist' && m.holding !== null)!;
    const hx = n.x - Math.sin(n.handAngle) * 0.5, hz = n.z - Math.cos(n.handAngle) * 0.5;
    Object.assign(l.gull.state, { x: hx, y: 1.1, z: hz + 0.85, vx: 0, vy: 0, vz: -24, heading: 0, mode: 'dive', diveT: 0.3, diveAngle: 0.9 });
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.carried?.type), { timeout: 20_000, intervals: [250] }).toBe('icecream');
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.some((m) => m.mode === 'slip'))).toBe(false);
  expect(errors).toEqual([]);
});
