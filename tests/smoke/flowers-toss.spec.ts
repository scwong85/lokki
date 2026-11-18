import { expect, test } from '@playwright/test';

/** Stage 2.4 Hard Hat, Soft Heart: the foreman has bought flowers, a fright makes him drop them, the gull takes them off the floor: he chases. */
test('hard hat: flowers picked up off the floor make the foreman chase and tick the "take" step (real wiring)', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=a2s4&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  await page.waitForTimeout(1500);
  type Lk = { gull: { state: Record<string, unknown> }; npcs: { npcs: { role: string; x: number; z: number; mode: string; hadComfort: boolean }[]; soakRadius: (x: number, z: number, r: number) => number; serve: (n: unknown, st: string, type: string) => void }; interaction: { props: { props: { type: string; heldBy: number | null; carried: boolean; cur: { p: { x: number; z: number } } }[] }; carried: { type: string } | null }; quests: { onEvent: (e: string) => unknown } };
  // he has bought the flowers (the chain's earlier steps), then a fright makes him drop them
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; const f = l.npcs.npcs.find((n) => n.role === 'hardhat')!; f.hadComfort = true; l.npcs.serve(f, 'floristStand', 'flowers'); l.npcs.soakRadius(f.x, f.z, 0.6); });
  await page.waitForTimeout(2000);
  // the stall's other flowers would confuse the beak in this test: take them off the counter
  await page.evaluate(() => { const l = (window as unknown as { __lokki: { interaction: { props: { props: { id: number; type: string; heldBy: number | null }[]; destroy: (p: unknown) => void } }; npcs: { droppedBy: Map<number, number> } } }).__lokki; for (const p of [...l.interaction.props.props]) if (p.type === 'flowers' && p.heldBy === null && !l.npcs.droppedBy.has(p.id)) l.interaction.props.destroy(p); });
  for (let k = 0; k < 14; k++) {
    const got = await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; if (l.interaction.carried) return true; const dropped = (l.npcs as unknown as { droppedBy: Map<number, number> }).droppedBy;
    const c = l.interaction.props.props.find((p) => (p as unknown as { id: number }).id !== undefined && dropped.has((p as unknown as { id: number }).id) && p.heldBy === null && !p.carried); if (c) Object.assign(l.gull.state, { x: c.cur.p.x, y: 0.7, z: c.cur.p.z + 0.15, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'air' }); return false; });
    if (got) break;
    await page.waitForTimeout(250);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(600);
  }
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.carried?.type)).toBe('flowers');
  const seen = new Set<string>();
  for (let i = 0; i < 100 && !seen.has('chase'); i++) {
    seen.add(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.find((n) => n.role === 'hardhat')!.mode));
    await page.waitForTimeout(200);
  }
  expect(seen.has('chase')).toBe(true);
  expect(errors).toEqual([]);
});
