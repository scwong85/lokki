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

test('level 2: splatting the sign sends the Clean Freak scrubbing (his fish is open) and counts', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => localStorage.setItem('lokki-save-v1', JSON.stringify({ version: 1, level: 'bombs-away', levels: { 'snack-attack': { stars: [true, false, false], best: 100, clears: 1 } } })));
  await page.goto('/?level=bombs-away');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  type W = { __lokki: { gull: { state: Record<string, number | string> }; interaction: { props: { props: { tag?: string; cur: { p: { x: number; y: number; z: number } } }[] }; beak: (i: number) => unknown }; npcs: { npcs: { role: string; cleanT: number; distractT: number; holding: number | null }[] }; players: { input: { tap: (c: string) => void } }[]; quests: { quests: { id: string; status: string; objectives: { done: boolean }[] }[] } } };
  const dropOn = async (tag: string) => {
    await page.evaluate((t) => {
      const l = (window as unknown as W).__lokki;
      const p = l.interaction.props.props.find((x) => x.tag === t)!.cur.p;
      Object.assign(l.gull.state, { x: p.x, y: 2.1, z: p.z, vx: 0, vy: 0, vz: 0, mode: 'air', heading: 0 }); // low, so the wind cannot carry the drop off
    }, tag);
    await page.waitForTimeout(500);
    await page.evaluate(() => (window as unknown as W).__lokki.players[0].input.tap('KeyF'));
  };
  // the sign: he rushes to scrub, with his back to the fish
  await expect.poll(async () => { await dropOn('cleanSign'); await page.waitForTimeout(6000); return page.evaluate(() => (window as unknown as W).__lokki.npcs.npcs.find((n) => n.role === 'cleaner')!.cleanT > 0); }, { timeout: 120_000, intervals: [200] }).toBe(true);
  expect(await page.evaluate(() => (window as unknown as W).__lokki.npcs.npcs.find((n) => n.role === 'cleaner')!.distractT > 0)).toBe(true);
  expect(await page.evaluate(() => (window as unknown as W).__lokki.quests.quests.find((q) => q.id === 'freak')!.objectives[0].done)).toBe(true);
  expect(errors).toEqual([]);
});

test('level 3: a noise makes the watchful tourist look away (first to-do), and the crates with bottles are there', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/?level=nosy-parkers');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  type W = { __lokki: { noise: (x: number, z: number, l: number) => void; interaction: { props: { props: { type: string }[] } }; quests: { quests: { id: string; objectives: { done: boolean }[] }[] }; npcs: { npcs: { x: number; z: number; holding: number | null; stationary: boolean; distractT: number }[] } } };
  expect(await page.evaluate(() => (window as unknown as W).__lokki.interaction.props.props.filter((p) => p.type === 'bottle').length)).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => {
    await page.evaluate(() => {
      const l = (window as unknown as W).__lokki;
      const w = l.npcs.npcs.find((n) => n.stationary && n.holding !== null)!;
      l.noise(w.x + 4, w.z + 2, 1.5);
    });
    await page.waitForTimeout(800);
    return page.evaluate(() => (window as unknown as W).__lokki.quests.quests.find((q) => q.id === 'bottleService')!.objectives[0].done);
  }, { timeout: 120_000, intervals: [200] }).toBe(true);
  expect(errors).toEqual([]);
});

test('level 4: a herring left at the blogger\'s feet after her soup is taken earns the review', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/?level=butterfingers');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  type W = { __lokki: { quests: { quests: { id: string; status: string; objectives: { done: boolean }[] }[] }; interaction: { props: { props: { type: string; id: number; heldBy: number | null; body: { setTranslation: (v: object, w: boolean) => void } }[]; destroy: (p: unknown) => void; release: (p: unknown, v: object) => void; byId: (id: number) => unknown } }; npcs: { npcs: { role: string; x: number; z: number; holding: number | null; holdType: string | null; mode: string }[] } } };
  const state = () => page.evaluate(() => { const l = (window as unknown as W).__lokki; const b = l.npcs.npcs.find((n) => n.role === 'blogger')!; return { holding: b.holdType, soup: l.interaction.props.props.some((p) => p.type === 'soup' && p.heldBy !== null) }; });
  expect((await state()).holding).toBe('soup');
  // the real events: soup snatched (the quest event), then a herring lies at her feet
  await page.evaluate(() => {
    const l = (window as unknown as W & { __lokki: { notes: (n: unknown) => void; quests: { onEvent: (e: string) => unknown } } }).__lokki;
    const b = l.npcs.npcs.find((n) => n.role === 'blogger')!;
    const soup = l.interaction.props.props.find((p) => p.type === 'soup')!;
    l.interaction.props.release(soup, { x: 0, y: 0, z: 0 }); // her hands are empty now (as after a snatch)
    b.holding = null;
    b.holdType = null;
    l.notes(l.quests.onEvent('snatch:soup'));
    const h = l.interaction.props.props.find((p) => p.type === 'herring')!;
    h.body.setTranslation({ x: b.x + 0.8, y: 0.2, z: b.z + 0.3 }, true);
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__lokki.quests.quests.find((q) => q.id === 'switch')!.status), { timeout: 200_000, intervals: [300] }).toBe('won');
  expect(errors).toEqual([]);
});

test('clearing a level offers the next one (Next button), and it starts straight away', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/?level=snack-attack');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await page.evaluate(() => {
    const x = (window as unknown as { __lokki: Lk }).__lokki;
    x.notes(x.quests.onEvent('snatch:icecream'));
    for (let i = 0; i < 400; i++) x.notes(x.quests.tick({ dt: 1 / 60, carryingStolen: true, nearestNpc: 99 }));
    x.notes(x.quests.onEvent('feast'));
  });
  await expect(page.locator('#levelcomplete')).toContainText('cleared!');
  const next = page.locator('[data-go=bombs-away]');
  await expect(next).toContainText('2. Bombs Away');
  await next.click();
  await page.waitForFunction(() => location.search.includes('level=bombs-away') && (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.level)).toBe('bombs-away');
  expect(await page.locator('#title').isVisible()).toBe(false);
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.quests.quests.map((q) => q.id))).toContain('freak'); // level 2 is open (level 1 was cleared)
  expect(errors).toEqual([]);
});

test('L opens the level list: unlocked levels can be replayed, locked ones are marked; picking one starts it with no title screen', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // level 1 cleared, so level 2 is open; levels 3 and 4 are still locked
  await page.addInitScript(() => localStorage.setItem('lokki-save-v1', JSON.stringify({ version: 1, level: 'snack-attack', levels: { 'snack-attack': { stars: [true, true, false], best: 142, clears: 1 } } })));
  await page.goto('/?level=snack-attack');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  const panel = page.locator('#levelselect');
  await expect
    .poll(async () => {
      if (!(await panel.isVisible())) {
        await page.keyboard.press('KeyL'); // the first key press also starts the audio, which can stall a headless page: retry
        await page.waitForTimeout(500);
      }
      return panel.isVisible();
    }, { timeout: 20_000 })
    .toBe(true);
  await expect(page.locator('[data-pick=snack-attack]')).toContainText('★★☆');
  await expect(page.locator('[data-pick=snack-attack]')).toContainText('best 2:22');
  await expect(page.locator('[data-pick=bombs-away]')).not.toHaveClass(/locked/);
  await expect(page.locator('[data-pick=nosy-parkers]')).toHaveClass(/locked/);
  await expect(page.locator('[data-pick=nosy-parkers]')).toContainText('Clear 2. Bombs Away first');
  await page.locator('[data-pick=nosy-parkers]').click({ force: true }); // locked: nothing happens
  await expect(panel).toBeVisible();
  await page.locator('[data-pick=bombs-away]').click();
  await page.waitForFunction(() => location.search.includes('level=bombs-away') && (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lk }).__lokki.level)).toBe('bombs-away');

  // the title screen: choosing a level there starts it straight away (no second dialog)
  await page.goto('/?title&level=snack-attack');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await expect(page.locator('#title')).toBeVisible();
  await page.locator('[data-level=bombs-away]').click();
  await page.waitForFunction(() => location.search.includes('level=bombs-away') && (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await expect(page.locator('#title')).toBeHidden();
  // `play` in the address skips the title even where it would normally show
  await page.goto('/?title&play&level=snack-attack');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await expect(page.locator('#title')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a level can be switched in place (no reload): new to-dos, people and heat meter', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?level=snack-attack');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 7));
  const l = L(page);
  expect(await page.locator('#heat').count()).toBe(0);
  await page.evaluate(() => (window as unknown as { __lokki: { loadLevel: (id: string) => void } }).__lokki.loadLevel('sandbox'));
  expect(await l((x) => x.level)).toBe('sandbox');
  expect(await page.evaluate(() => (window as unknown as { __marker: number }).__marker)).toBe(7); // same page: nothing reloaded
  expect((await l((x) => x.quests.quests.length)) > 4).toBe(true);
  expect(await page.locator('#heat').count()).toBe(1);
  await page.evaluate(() => (window as unknown as { __lokki: { loadLevel: (id: string) => void } }).__lokki.loadLevel('bombs-away'));
  expect(await l((x) => x.level)).toBe('bombs-away');
  expect(await page.locator('#heat').count()).toBe(0);
  expect(errors).toEqual([]);
});
