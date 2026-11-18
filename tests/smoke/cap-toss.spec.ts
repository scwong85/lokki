import { expect, test } from '@playwright/test';

/** Stage 2.2: knock the cap out of the graduate's hand, pick it up off the floor with E: he sets off after the gull. */
test('cap toss: picking the dropped cap off the floor makes the graduate chase (the real game wiring)', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=a2s2&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  await page.waitForTimeout(1500);
  type Lk = { gull: { state: Record<string, unknown> }; npcs: { npcs: { role: string; x: number; z: number; mode: string; holding: number | null }[]; soakRadius: (x: number, z: number, r: number) => number }; interaction: { props: { props: { type: string; heldBy: number | null; carried: boolean; cur: { p: { x: number; z: number } } }[] }; carried: { type: string } | null }; quests: { quests: { id: string; objectives: { done: boolean }[] }[] } };
  // the cap falls to the floor (a fright makes him drop it)
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; const g = l.npcs.npcs.find((n) => n.role === 'graduate')!; l.npcs.soakRadius(g.x, g.z, 0.6); });
  await page.waitForTimeout(2500);
  // the gull goes to the cap and takes it (E), trying a few times: the cap rolls about a little
  for (let k = 0; k < 12; k++) {
    const got = await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; if (l.interaction.carried) return true; const c = l.interaction.props.props.find((p) => p.type === 'cap' && p.heldBy === null && !p.carried && Math.abs(p.cur.p.z + 313) < 8); if (c) Object.assign(l.gull.state, { x: c.cur.p.x, y: 0.9, z: c.cur.p.z + 0.4, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'air' }); return false; });
    if (got) break;
    await page.waitForTimeout(250);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(600);
  }
  await expect.poll(() => page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; return l.interaction.carried?.type; }), { timeout: 20_000 }).toBe('cap');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.some((n) => n.role === 'graduate' && n.mode === 'chase')), { timeout: 30_000, intervals: [500] }).toBe(true);
  await expect.poll(() => page.evaluate(() => { const q = (window as unknown as { __lokki: Lk }).__lokki.quests.quests.find((x) => x.id === 'caps')!; return q.objectives.slice(0, 2).every((o) => o.done); }), { timeout: 30_000 }).toBe(true);
  expect(errors).toEqual([]);
});
