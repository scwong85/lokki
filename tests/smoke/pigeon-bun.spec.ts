import { expect, test } from '@playwright/test';

/** Stage 2.5: a bun dropped by the emperor's statue wins the Pigeon Gang over (the first step of the ceremony chain). */
test('stage 2.5 (real flow): snatch the student\'s bun, drop it by the statue, the pigeons become friends', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=a2s5&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  type Lk = { gull: { state: Record<string, unknown> }; npcs: { npcs: { role: string; x: number; z: number; handAngle: number; holding: number | null; holdType: string | null }[] }; interaction: { carried: { type: string } | null }; gang: { mode: string } };
  await page.evaluate(() => {
    const l = (window as unknown as { __lokki: Lk }).__lokki;
    const n = l.npcs.npcs.find((m) => m.holdType === 'bun' && m.role === 'student')!;
    const hx = n.x - Math.sin(n.handAngle) * 0.5, hz = n.z - Math.cos(n.handAngle) * 0.5;
    Object.assign(l.gull.state, { x: hx, y: 1.1, z: hz + 0.85, vx: 0, vy: 0, vz: -24, heading: 0, mode: 'dive', diveT: 0.3, diveAngle: 0.9 });
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.carried?.type), { timeout: 30_000, intervals: [250] }).toBe('bun');
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; Object.assign(l.gull.state, { x: -156.5, y: 0.5, z: -295, vx: 0, vy: 0, vz: 0, mode: 'ground', heading: 0 }); });
  await expect(async () => {
    await page.keyboard.press('KeyE');
    expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.gang.mode)).toBe('friends');
  }).toPass({ timeout: 60_000, intervals: [1000] });
  expect(errors).toEqual([]);
});

test('stage 2.5: a bun by the statue befriends the pigeons, and there is a bun to find', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=a2s5&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  type Lk = {
    interaction: { props: { props: { type: string; heldBy: number | null }[]; spawn(s: object): unknown } };
    quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
    gang: { mode: string };
  };
  // a bun exists somewhere in the level (on a plate, in a hand, on the ground)
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.props.props.filter((p) => p.type === 'bun').length)).toBeGreaterThan(0);
  // the pigeons' bun must not be the library's snack: a loose bun and a picnicker with a bun exist as well
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.props.props.filter((p) => p.type === 'bun' && p.heldBy === null).length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk & { npcs: { npcs: { role: string; holdType: string | null }[] } } }).__lokki.npcs.npcs.some((n) => n.role === 'picnic' && n.holdType === 'bun'))).toBe(true);
  await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.props.spawn({ type: 'bun', x: -156.5, y: 0.4, z: -296.5 }));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.gang.mode), { timeout: 60_000, intervals: [500] }).toBe('friends');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.quests.quests.find((q) => q.id === 'ceremony')!.objectives.find((o) => o.id === 'pigeons')!.done), { timeout: 20_000 }).toBe(true);
  expect(errors).toEqual([]);
});

test('stage 2.5 with Pigeon Diplomacy (friends from the start): a bun still wins the first step', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=a2s5&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  type Lk = {
    skills: { unlock(id: string): unknown };
    loadLevel(id: string): void;
    interaction: { props: { spawn(s: object): unknown } };
    quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
    gang: { mode: string };
  };
  await page.evaluate(() => { const l = (window as unknown as { __lokki: Lk }).__lokki; l.skills.unlock('pigeons'); l.loadLevel('a2s5'); });
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.gang.mode)).toBe('friends');
  await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.interaction.props.spawn({ type: 'bun', x: -156.5, y: 0.4, z: -296.5 }));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.quests.quests.find((q) => q.id === 'ceremony')!.objectives.find((o) => o.id === 'pigeons')!.done), { timeout: 60_000, intervals: [500] }).toBe(true);
  expect(errors).toEqual([]);
});
