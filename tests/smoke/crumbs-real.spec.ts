import { expect, test } from '@playwright/test';

/** Breadcrumbs through the real controls: arrive from another level (the menu path), grab a bun with E, drop it by a hungry person with E. */
test('breadcrumbs: a bun the gull picks up and puts down is eaten by a bystander', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=first-light-v1&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  type Lk = {
    loadLevel(id: string): void;
    gull: { state: Record<string, unknown> };
    interaction: { carried: { type: string } | null; props: { props: { type: string; broken: boolean; cur: { p: { x: number; z: number } } }[] } };
    npcs: { npcs: { role: string; x: number; z: number }[]; crumbsEaten: number; crumbs: string[] };
  };
  await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.loadLevel('breadcrumbs'));
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.crumbs)).toEqual(['bun']);
  // beside a bun, facing it: E picks it up
  await page.evaluate(() => {
    const l = (window as unknown as { __lokki: Lk }).__lokki;
    const b = l.interaction.props.props.find((p) => p.type === 'bun' && !p.broken)!;
    Object.assign(l.gull.state, { x: b.cur.p.x, y: 0.3, z: b.cur.p.z + 0.9, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'ground' });
  });
  await expect(async () => {
    await page.keyboard.press('KeyE');
    expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.carried?.type)).toBe('bun');
  }).toPass({ timeout: 60_000, intervals: [1000] });
  // walk it over beside a bystander and put it down
  await page.evaluate(() => {
    const l = (window as unknown as { __lokki: Lk }).__lokki;
    const n = l.npcs.npcs.find((m) => m.role === 'bystander')!;
    Object.assign(l.gull.state, { x: n.x + 3, y: 0.3, z: n.z, vx: 0, vy: 0, vz: 0, mode: 'ground' });
  });
  await expect(async () => {
    await page.keyboard.press('KeyE');
    expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.carried)).toBeNull();
  }).toPass({ timeout: 30_000, intervals: [700] });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.crumbsEaten), { timeout: 240_000, intervals: [3000] }).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

/** Picking a stage from the menu (levels load in place) must bring the same background crowd as opening it directly. */
test('a stage picked from the menu has its strollers', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=breadcrumbs&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  type Lk = { loadLevel(id: string): void; npcs: { npcs: { role: string }[] } };
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.filter((n) => n.role === 'stroller').length)).toBe(0);
  await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.loadLevel('a1s2'));
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.npcs.npcs.filter((n) => n.role === 'stroller').length)).toBeGreaterThanOrEqual(4);
});
