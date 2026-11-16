import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Body = { setTranslation: (v: { x: number; y: number; z: number }, w: boolean) => void };
type Lk = {
  notes: (n: unknown) => void;
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean; count: number }[] }[]; onEvent: (e: string) => unknown };
  noise: (x: number, z: number, loud: number) => void;
  skills: { has: (id: string) => boolean };
  abilities: { use: (id: string) => boolean; disguised: boolean };
  gull: { state: Record<string, number | string>; setDisguise: (b: boolean) => void };
  defense: { hiddenLines: boolean; response: { deployed: Set<string> } } | null;
  interaction: { props: { props: { type: string; tag?: string; body: Body }[] } };
};
type Ask = <T>(fn: (l: Lk, a?: unknown) => T, arg?: unknown) => Promise<Awaited<T>>;
const lk = (p: Page): Ask => (fn, arg) => p.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as never;
const open = async (page: Page, level: string) => {
  await page.goto(`/?level=${level}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return lk(page);
};
const done = (L: Ask, q: string, o: string) => L((l, a) => { const [qq, oo] = a as [string, string]; return l.quests.quests.find((x) => x.id === qq)?.objectives.find((x) => x.id === oo)?.done ?? false; }, [q, o]);

test('level 9: crow calls herd the tour group into the photo frame', async ({ page }) => {
  test.setTimeout(480_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'caw-of-the-wild');
  expect(await L((l) => l.skills.has('mimic'))).toBe(true); // lent for the level
  await L((l) => l.noise(17, -15, 1.7)); // a crow call in the middle of the frame, loud enough to carry
  await expect.poll(() => done(L, 'photo', 'herd'), { timeout: 400_000 }).toBe(true);
  expect(errors).toEqual([]);
});

test('level 10: the lines are hidden until hawk-eye, and hawk-eye is lent', async ({ page }) => {
  test.setTimeout(240_000);
  const L = await open(page, 'invisible-maze');
  expect(await L((l) => l.skills.has('hawkeye'))).toBe(true);
  expect(await L((l) => l.defense!.hiddenLines)).toBe(true);
  expect(await L((l) => [...l.defense!.response.deployed])).toEqual(['lines']);
});

test('level 11: three chairs in the spot with one on top is a tower', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'heavy-lifting');
  expect(await L((l) => l.skills.has('fatbird'))).toBe(true);
  await L((l) => {
    const chairs = l.interaction.props.props.filter((p) => p.type === 'chair');
    const at = [[-24.5, 0.5, -16], [-23.5, 0.5, -16], [-24, 0.5, -15], [-24, 1.1, -16]];
    chairs.slice(0, 4).forEach((c, i) => c.body.setTranslation({ x: at[i][0], y: at[i][1], z: at[i][2] }, true));
  });
  await expect.poll(() => done(L, 'tower', 'three'), { timeout: 120_000 }).toBe(true);
});

test('level 12: a noise near a vendor makes him stare (and the flock call is lent)', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'gulls-eleven');
  expect(await L((l) => l.skills.has('flock'))).toBe(true);
  await L((l) => l.noise(0, -33, 1));
  await expect.poll(() => L((l) => l.quests.quests.find((q) => q.id === 'stare')!.objectives[0].count), { timeout: 120_000 }).toBeGreaterThan(0);
});

test('level 13: flying breaks the pigeon disguise', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'coo-coo-undercover');
  expect(await L((l) => l.skills.has('disguise'))).toBe(true);
  await L((l) => {
    l.abilities.use('disguise');
    l.gull.setDisguise(true);
  });
  expect(await L((l) => l.abilities.disguised)).toBe(true);
  await L((l) => {
    Object.assign(l.gull.state, { mode: 'air', y: 12 });
  });
  await expect.poll(() => L((l) => l.abilities.disguised), { timeout: 120_000 }).toBe(false);
});

test('level 14: gliding into a thermal counts as riding it', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'thermal-express');
  expect(await L((l) => l.skills.has('flight'))).toBe(true);
  await L((l) => {
    Object.assign(l.gull.state, { x: 55, z: -42, y: 30, mode: 'air', vx: 0, vz: -14, vy: 0 });
  });
  await expect.poll(() => L((l) => l.quests.quests.find((q) => q.id === 'riders')!.objectives[0].count), { timeout: 120_000 }).toBeGreaterThanOrEqual(1);
});

test('level 14: the gold collar round the Uspenski dome is a roomy perch to land on', async ({ page }) => {
  test.setTimeout(200_000);
  await page.goto('/?level=thermal-express&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  const surf = await page.evaluate(() => {
    const w = (window as unknown as { __lokki: { world: { surfaceBelow: (x: number, z: number, y: number) => { y: number; kind: string | null } } } }).__lokki.world;
    // the collar is about 5 m wide around the little onion (dome at 272.5, -160.4); probe a ring of points 4 m out from the middle
    return [0, 1, 2, 3, 4, 5].map((k) => w.surfaceBelow(272.5 + Math.cos(k) * 4.2, -160.4 + Math.sin(k) * 4.2, 60));
  });
  for (const s of surf) {
    expect(s.kind).toBe('perch');
    expect(s.y).toBeGreaterThan(24); // far above the 18 m roof, where the level asks the bun to land (20 m and up)
  }
});

test('level 14: standing on the dome collar with the bun delivers it', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/?level=thermal-express&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  await page.evaluate(() => {
    type L = { gull: { state: Record<string, number | string> }; interaction: { props: { spawn: (s: { type: string; x: number; y: number; z: number; tag?: string }) => { id: number } & object; props: { id: number }[] }; catchProp: (id: number, p: unknown) => unknown } };
    const l = (window as unknown as { __lokki: L }).__lokki;
    const p = l.interaction.props.spawn({ type: 'bun', x: 276.7, y: 40, z: -160.4, tag: 'warmBun' });
    // standing on the collar (its top is about 27.6 m up, four metres from the middle of the big onion)
    Object.assign(l.gull.state, { x: 276.7, y: 28.1, z: -160.4, vx: 0, vy: 0, vz: 0, mode: 'ground', heading: 0 });
    l.interaction.catchProp(0, p);
    const k = (window as unknown as { __lokki: { notes: (n: unknown) => void; quests: { onEvent: (e: string) => unknown } } }).__lokki;
    k.notes(k.quests.onEvent('grab:warmBun')); // the grab starts the timed quest
  });
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __lokki: { quests: { quests: { id: string; objectives: { done: boolean }[] }[] } } }).__lokki.quests.quests.find((q) => q.id === 'express')!.objectives[0].done), { timeout: 200_000 })
    .toBe(true);
});
