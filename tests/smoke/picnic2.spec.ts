import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type V3 = { x: number; y: number; z: number };
type Prop = { id: number; type: string; tag?: string; heldBy: number | null; carried: boolean; cur: { p: V3 }; body: { setTranslation(v: V3, w: boolean): void; setLinvel(v: V3, w: boolean): void } };
type Npc = { role: string; x: number; z: number; obliviousT: number; ritualT: number };
type Lk = {
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean }[] }[] };
  gull: { state: Record<string, unknown> };
  interaction: { props: { props: Prop[]; grab(p: Prop): void }; beak(id: number): { carried: Prop | null }; dropCarried(s: unknown, id: number): Prop | null };
  npcs: { npcs: Npc[] };
  runLog: { events: { t: number; kind: string }[] };
  rowTimes: { lines(names?: string[]): string[] };
  tuning: { picnic: { raidTakeAfter: { value: number } }; pigeonRace: { raceSeconds: { value: number } } };
  race: { mode: string } | null;
  raid: { active: boolean } | null;
  gang: { mode: string } | null;
  picnicGuests: { count: number } | null;
  honkNow(): void;
  peckNow(): boolean;
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;

const BLANKET = { x: -14, y: 4.8, z: -17 };

test('1.2 The Gull Picnic, version two: three courses, chained rows, the Guard, the pigeon race, the raid and its take-back, the gong', async ({ page }) => {
  test.setTimeout(2_400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true, hints: 'full' })));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?level=a1s2&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  const l = L(page);
  const status = (q: string) => l<string, string>((x, a) => x.quests.quests.find((m) => m.id === a)!.status, q);
  const row = (o: string) => l<boolean, string>((x, a) => x.quests.quests.find((m) => m.id === 'picnic')!.objectives.find((m) => m.id === a)!.done, o);
  const put = (tag: string, at: V3) => l<number, { tag: string; at: V3 }>((x, a) => {
    const p = x.interaction.props.props.find((q) => q.tag === a.tag)!;
    p.body.setTranslation(a.at, true);
    p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    return p.id;
  }, { tag, at });
  const gullTo = (p: V3, mode = 'ground', heading = 0) => l<number, { p: V3; mode: string; heading: number }>((x, a) => { Object.assign(x.gull.state, { ...a.p, vx: 0, vy: 0, vz: 0, heading: a.heading, mode: a.mode }); return 0; }, { p, mode, heading });
  const npc = (role: string) => l<{ x: number; z: number; ob: number; ritualT: number }, string>((x, a) => { const n = x.npcs.npcs.find((m) => m.role === a)!; return { x: n.x, z: n.z, ob: n.obliviousT, ritualT: n.ritualT }; }, role);
  const note = () => page.locator('#todo').innerText();
  const logged = (kind: string) => l<number, string>((x, a) => x.runLog.events.filter((e) => e.kind === a).length, kind);
  const onRoof = (tag: string, dx = 0, dz = 0) => put(tag, { x: BLANKET.x + dx, y: BLANKET.y + 0.6, z: BLANKET.z + dz });
  // quicker raid and a roomier race for the test (the sim runs at a fraction of real time here)
  await l((x) => { x.tuning.picnic.raidTakeAfter.value = 6; x.tuning.pigeonRace.raceSeconds.value = 10; return 0; });

  // the note: six rows hidden, three courses, the later two locked and saying what opens them
  await expect.poll(note, { timeout: 30_000 }).toContain('The Gull Picnic 0 / 6');
  const text = await note();
  expect(text.toLowerCase()).toContain('starters');
  expect(text).toContain('opens when the starters are served');
  expect(text).toContain('opens when the main course is served');
  expect(text.toLowerCase()).toContain('side orders');
  // a row in a course that is not open does not count
  await put('thermos', { x: BLANKET.x, y: BLANKET.y + 0.6, z: BLANKET.z });
  await page.waitForTimeout(4000);
  expect(await row('thermos')).toBe(false);
  await put('thermos', { x: 4, y: 1.2, z: -12 });

  // ---- Starters ----
  // the Waiter: no flourish without customers; two buns dropped by his table bring the strollers; then up goes the cloth
  await page.waitForTimeout(6000);
  expect((await npc('waiter')).ritualT).toBe(0);
  // (the strollers walking to a bun is the crumb system's, tested in crumbs-real.spec.ts; here the two customers just sit down at his table)
  await l((x) => {
    const [a, b] = x.npcs.npcs.filter((n) => n.role === 'customer');
    Object.assign(a, { x: -113, z: -59, stationary: true });
    Object.assign(b, { x: -114, z: -63, stationary: true });
    return 0;
  });
  await expect.poll(() => npc('waiter').then((n) => n.ritualT), { timeout: 200_000, intervals: [500] }).toBeGreaterThan(0);
  // catch the cloth on the first frame it is in the air (polling from outside can miss a 1.3 s toss at a few frames a second), and put it on the roof
  await page.evaluate(([bx, by, bz]) => new Promise<void>((resolve) => {
    const lk = (window as unknown as { __lokki: Lk }).__lokki;
    const tick = () => {
      const p = lk.interaction.props.props.find((q) => q.tag === 'waiterCloth')!;
      if (p.heldBy === null && p.cur.p.y > 2) {
        p.body.setTranslation({ x: bx - 1, y: by + 0.6, z: bz }, true);
        p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        resolve();
      } else setTimeout(tick, 4);
    };
    tick();
  }), [BLANKET.x, BLANKET.y, BLANKET.z]);
  await expect.poll(() => row('cloth'), { timeout: 60_000 }).toBe(true);

  // the Baker: a splat on the awning does nothing; a bottle from the statue dropped on the bell rings it
  await gullTo({ x: -12, y: 7, z: -69 }, 'air');
  await page.keyboard.press('f');
  await page.waitForTimeout(6000);
  expect(await logged('hit:doorbell')).toBe(0);
  await l((x) => {
    const b = x.interaction.props.props.find((q) => q.type === 'bottle' && q.cur.p.x < -100)!;
    b.body.setTranslation({ x: -12, y: 3.2, z: -69 }, true);
    b.body.setLinvel({ x: 0, y: -9, z: 0 }, true);
    return 0;
  });
  await expect.poll(() => logged('hit:doorbell'), { timeout: 90_000, intervals: [200] }).toBeGreaterThan(0);
  await onRoof('rye', 1);
  await expect.poll(() => row('loaf'), { timeout: 60_000 }).toBe(true);

  // the starters are served: a crowd off the ferry and the Market Guard; the main course opens on the note
  await expect.poll(() => logged('courseServed:1'), { timeout: 30_000 }).toBe(1);
  await expect.poll(() => l((x) => x.npcs.npcs.some((n) => n.role === 'marketguard') && x.npcs.npcs.some((n) => n.role === 'passenger')), { timeout: 30_000 }).toBe(true);
  await gullTo({ x: 40, y: 6, z: -32 }, 'air');
  await expect.poll(note, { timeout: 30_000 }).toContain('Get the Fisherman');

  // ---- Main course ----
  // the Fisherman: a splat by the float brings up a boot; the boot dropped in the water by the float is a monster
  await gullTo({ x: 50, y: 7, z: -30 }, 'air');
  await page.keyboard.press('f');
  await expect.poll(() => l((x) => x.interaction.props.props.some((q) => q.tag === 'bootTool')), { timeout: 60_000 }).toBe(true);
  await put('bootTool', { x: 50, y: 3, z: -30 });
  await expect.poll(() => logged('bootSplash'), { timeout: 90_000, intervals: [200] }).toBeGreaterThan(0);
  await expect.poll(() => npc('fisher').then((n) => n.ob), { timeout: 30_000 }).toBeGreaterThan(0);
  await onRoof('catch', 0, 1);
  await expect.poll(() => row('herring'), { timeout: 60_000 }).toBe(true);
  await onRoof('thermos', 1, 1);
  await expect.poll(() => row('thermos'), { timeout: 60_000 }).toBe(true);
  await expect.poll(() => logged('courseServed:2'), { timeout: 30_000 }).toBe(1);

  // ---- Dessert ----
  await onRoof('punnet', 0, -1);
  await expect.poll(() => row('berries'), { timeout: 60_000 }).toBe(true);

  // the Diner: a honk from behind drops the cone, the pigeons race for it, and we take it in time
  await gullTo({ x: -66, y: 0.5, z: -57.5 }, 'ground', 0);
  await page.waitForTimeout(1500);
  await l((x) => { x.honkNow(); return 0; });
  await expect.poll(() => logged('honkDrop:diner'), { timeout: 60_000, intervals: [100] }).toBeGreaterThan(0);
  await expect.poll(() => l((x) => x.race?.mode), { timeout: 30_000, intervals: [100] }).toBe('racing');
  await l((x) => {
    const cone = x.interaction.props.props.find((q) => q.tag === 'dinerCone')!;
    x.interaction.props.grab(cone);
    x.interaction.beak(0).carried = cone;
    return 0;
  });
  await expect.poll(() => l((x) => x.race?.mode), { timeout: 30_000, intervals: [100] }).toBe('chasing');
  // the gull flies to the roof with the flock behind it: the raid begins
  await gullTo({ x: BLANKET.x, y: BLANKET.y + 2, z: BLANKET.z }, 'air');
  await expect.poll(() => logged('pigeonsArrive'), { timeout: 60_000, intervals: [100] }).toBe(1);
  expect(await l((x) => x.raid?.active)).toBe(true);
  expect(await l((x) => x.gang?.mode)).toBe('guarding');
  await page.screenshot({ path: 'tests/__screenshots__/picnic2-raid.png' });
  // deliver the cone, then ignore the pigeons: they carry the cone off and the row is open again
  await l((x) => { x.interaction.dropCarried(x.gull.state, 0); return 0; });
  await onRoof('dinerCone', 0, 1.5);
  await expect.poll(() => row('vendace'), { timeout: 60_000 }).toBe(true);
  expect(await status('picnic')).toBe('won');
  await expect.poll(() => logged('raidTook'), { timeout: 240_000, intervals: [200] }).toBe(1);
  expect(await row('vendace')).toBe(false);
  expect(await status('picnic')).toBe('active');
  const cone = await l((x) => { const c = x.interaction.props.props.find((q) => q.tag === 'dinerCone')!; return c.cur.p; });
  expect(Math.hypot(cone.x + 44, cone.z + 40)).toBeLessThan(6); // lying where they dropped it
  // fetch it back and serve it again
  await onRoof('dinerCone', 0, 1.5);
  await expect.poll(() => row('vendace'), { timeout: 60_000 }).toBe(true);
  await expect.poll(() => status('picnic'), { timeout: 30_000 }).toBe('won');
  expect(await l((x) => x.picnicGuests?.count)).toBeGreaterThanOrEqual(6);

  // see off the raid with a honk; ring the gong; the stage clears and the card says where the minutes went
  await gullTo({ x: BLANKET.x + 2, y: BLANKET.y + 0.6, z: BLANKET.z + 2 });
  await page.waitForTimeout(500);
  await l((x) => { x.honkNow(); return 0; });
  await expect.poll(() => status('raid'), { timeout: 30_000 }).toBe('won');
  await expect.poll(() => status('picnicGong'), { timeout: 30_000 }).toBe('active');
  await gullTo({ x: BLANKET.x + 4.4, y: BLANKET.y + 0.6, z: BLANKET.z - 1.2 });
  await page.waitForTimeout(500);
  expect(await l((x) => x.peckNow())).toBe(true);
  await expect.poll(() => status('picnicGong'), { timeout: 30_000 }).toBe('won');
  await expect.poll(() => page.locator('body').innerText(), { timeout: 60_000 }).toContain('Time per row');
  const lines = await l((x) => x.rowTimes.lines(['Starters', 'Main course', 'Dessert']));
  expect(lines.filter((s) => /\+\d+:\d\d/.test(s)).length).toBeGreaterThanOrEqual(7); // six rows, and the cone again
  expect(lines.some((s) => s.startsWith('Dessert'))).toBe(true);
  await page.screenshot({ path: 'tests/__screenshots__/picnic2-feast.png' });
  expect(errors).toEqual([]);
});
