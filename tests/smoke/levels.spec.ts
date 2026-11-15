import { expect, test } from '@playwright/test';

type Lk = {
  level: string;
  notes: (n: unknown) => void;
  quests: { quests: { id: string; status: string }[]; onEvent: (e: string) => unknown; tick: (c: unknown) => unknown };
  skills: { ids: string[] };
  saveData: () => { levels: Record<string, { stars: boolean[]; best: number | null }> };
};
const L = (page: import('@playwright/test').Page) => <T>(fn: (l: Lk) => T) => page.evaluate((src) => new Function('l', `return (${src})(l)`)((window as unknown as { __lokki: Lk }).__lokki), fn.toString()) as Promise<T>;

test('a level loads from data, is cleared with stars and a skill, the record is saved, and the title shows it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/?level=snack-attack');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  const l = L(page);
  expect(await l((x) => x.level)).toBe('snack-attack');
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['snack', 'feast', 'photobomb']);
  await expect(page.locator('#todo')).toContainText('???'); // the secret to-do
  expect(await page.locator('#heat').count()).toBe(0); // a calm city: no heat meter

  // snack + escape, then the victory perch
  await l((x) => {
    x.notes(x.quests.onEvent('snatch:icecream'));
    for (let i = 0; i < 400; i++) x.notes(x.quests.tick({ dt: 1 / 60, carryingStolen: true, nearestNpc: 99 }));
    x.notes(x.quests.onEvent('feast'));
    return 0;
  });
  await expect(page.locator('#levelcomplete')).toBeVisible();
  await expect(page.locator('#levelcomplete')).toContainText('★');
  const rec = await l((x) => x.saveData().levels['snack-attack']);
  expect(rec.stars[0]).toBe(true);
  expect(rec.stars[1]).toBe(false); // the secret is still undiscovered
  
  // the secret afterwards adds its star
  await l((x) => {
    x.notes(x.quests.onEvent('photobomb'));
    return 0;
  });
  await expect.poll(() => l((x) => x.saveData().levels['snack-attack'].stars[1])).toBe(true);

  // the title screen's level select shows the stars and offers free play
  await page.goto('/?level=snack-attack&title');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await expect(page.locator('[data-level=snack-attack]')).toContainText('★★');
  await expect(page.locator('[data-level=sandbox]')).toContainText('free play');
  expect(errors).toEqual([]);
});

test('level 1: the selfie tourist counts down, her ice cream opens on the shot, and standing in the frame wins the photobomb', async ({ page }) => {
  test.setTimeout(240_000); // the headless renderer runs the simulation slower than real time
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/?level=snack-attack');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  type N = { npcs: { npcs: { role: string; x: number; z: number; selfie: string; selfieCount: number; distractT: number; holding: number | null }[] } };
  const sel = <T>(fn: (n: N['npcs']['npcs'][number]) => T) =>
    page.evaluate((src) => { const l = (window as unknown as { __lokki: N }).__lokki; return new Function('n', `return (${src})(n)`)(l.npcs.npcs.find((n) => n.role === 'selfie')!); }, fn.toString()) as Promise<T>;
  expect(await sel((n) => n.holding !== null)).toBe(true);
  // stand in front of her phone (she faces +z), on the ground
  await page.evaluate(() => {
    const l = (window as unknown as { __lokki: N & { gull: { state: Record<string, number | string> } } }).__lokki;
    const n = l.npcs.npcs.find((x) => x.role === 'selfie')!;
    Object.assign(l.gull.state, { x: n.x, y: 0.5, z: n.z + 3.2, vx: 0, vy: 0, vz: 0, mode: 'ground' });
  });
  // she counts 3, 2, 1 ...
  const counts = new Set<number>();
  await expect.poll(async () => { const c = await sel((n) => (n.selfie === 'count' ? n.selfieCount : 0)); if (c) counts.add(c); return counts.has(1); }, { timeout: 150_000, intervals: [100] }).toBe(true);
  // ... then the shot: she only looks at the screen (distracted) and the bonus to-do is won
  await expect.poll(() => sel((n) => n.selfie), { timeout: 60_000, intervals: [100] }).toBe('open');
  expect(await sel((n) => n.distractT > 0)).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lokki: { quests: { quests: { id: string; status: string }[] } } }).__lokki.quests.quests.find((q) => q.id === 'photobomb')!.status), { timeout: 5000 }).toBe('won');
  expect(errors).toEqual([]);
});
