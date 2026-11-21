import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type V3 = { x: number; y: number; z: number };
type Prop = { id: number; type: string; tag?: string; heldBy: number | null; carried: boolean; cur: { p: V3 }; body: { setTranslation(v: V3, w: boolean): void; setLinvel(v: V3, w: boolean): void } };
type Npc = { role: string; x: number; z: number; heading: number; mode: string; goal: { name: string } | null; stationary: boolean; patrol: unknown; obliviousT: number; holding: number | null; ritualT: number; distractT: number };
type Lk = {
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean }[] }[] };
  gull: { state: Record<string, unknown> };
  interaction: { props: { props: Prop[]; grab(p: Prop): void }; beak(id: number): { carried: Prop | null } };
  npcs: { npcs: Npc[] };
  runLog: { events: { t: number; kind: string }[] };
  rowTimes: { lines(names?: string[]): string[] };
  honkNow(): void;
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;

const BLANKET = { x: -14, y: 4.8, z: -17 };

test('the picnic lab: courses, a waiter who waits for customers, a thrown-only bell, the Market Guard, time per row', async ({ page }) => {
  test.setTimeout(1_800_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true, hints: 'full' })));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?level=picnic-lab&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  const l = L(page);
  const row = (o: string) => l<boolean, string>((x, a) => x.quests.quests.find((m) => m.id === 'lab')!.objectives.find((m) => m.id === a)!.done, o);
  const put = (tag: string, at: V3) => l<number, { tag: string; at: V3 }>((x, a) => {
    const p = x.interaction.props.props.find((q) => q.tag === a.tag)!;
    p.body.setTranslation(a.at, true);
    p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    return p.id;
  }, { tag, at });
  const gullTo = (p: V3, mode = 'ground', heading = 0) => l<number, { p: V3; mode: string; heading: number }>((x, a) => { Object.assign(x.gull.state, { ...a.p, vx: 0, vy: 0, vz: 0, heading: a.heading, mode: a.mode }); return 0; }, { p, mode, heading });
  const npc = (role: string) => l<{ x: number; z: number; ob: number; ritualT: number; goal: string | null; mode: string }, string>((x, a) => { const n = x.npcs.npcs.find((m) => m.role === a)!; return { x: n.x, z: n.z, ob: n.obliviousT, ritualT: n.ritualT, goal: n.goal?.name ?? null, mode: n.mode }; }, role);
  const note = () => page.locator('#todo').innerText();
  const logged = (kind: string) => l<number, string>((x, a) => x.runLog.events.filter((e) => e.kind === a).length, kind);

  // the note: three rows, two courses; the second is locked and says what opens it
  await expect.poll(note, { timeout: 30_000 }).toContain('The Picnic lab 0 / 3');
  const text = await note();
  expect(text.toLowerCase()).toContain('starters');
  expect(text).toContain('Main course');
  expect(text).toContain('opens when the starters are served');
  expect(text).not.toContain('Market Guard');

  // a row in a course that is not open does not count: the thermos on the roof does nothing yet
  await put('thermos', { x: BLANKET.x, y: BLANKET.y + 0.6, z: BLANKET.z });
  await page.waitForTimeout(4000);
  expect(await row('thermos')).toBe(false);
  await put('thermos', { x: 6, y: 1.2, z: -12 }); // back on its table

  // the Waiter does not start his flourish without customers
  await expect.poll(() => npc('waiter').then((n) => n.ob), { timeout: 20_000 }).toBeGreaterThanOrEqual(0);
  await page.waitForTimeout(8000);
  expect((await npc('waiter')).ritualT).toBe(0);
  // two customers sit at his table: the countdown runs, he tosses the cloth up, and we put it on the roof
  await l((x) => {
    const [a, b] = x.npcs.npcs.filter((n) => n.role === 'customer');
    Object.assign(a, { x: -30, z: -12, stationary: true });
    Object.assign(b, { x: -31, z: -20, stationary: true });
    return 0;
  });
  await expect.poll(() => npc('waiter').then((n) => n.ritualT), { timeout: 240_000, intervals: [500] }).toBeGreaterThan(0);
  await expect.poll(() => l((x) => { const p = x.interaction.props.props.find((q) => q.tag === 'waiterCloth')!; return p.heldBy === null && p.cur.p.y > 2; }), { timeout: 400_000, intervals: [100] }).toBe(true);
  await put('waiterCloth', { x: BLANKET.x - 1, y: BLANKET.y + 0.6, z: BLANKET.z });
  await expect.poll(() => row('cloth'), { timeout: 60_000 }).toBe(true);

  // the bell is under an awning: a splat beside it does nothing; a bottle dropped on it rings it and the Baker comes
  await gullTo({ x: -6.6, y: 7, z: -12.2 }, 'air');
  await page.keyboard.press('f');
  await page.waitForTimeout(6000);
  expect(await logged('hit:doorbell')).toBe(0);
  await l((x) => {
    const b = x.interaction.props.props.find((q) => q.type === 'bottle' && Math.hypot(q.cur.p.x + 2, q.cur.p.z + 10.5) < 2)!;
    b.body.setTranslation({ x: -6.6, y: 3.2, z: -12.2 }, true);
    b.body.setLinvel({ x: 0, y: -9, z: 0 }, true);
    return 0;
  });
  await expect.poll(() => logged('hit:doorbell'), { timeout: 60_000, intervals: [200] }).toBeGreaterThan(0);
  await put('rye', { x: BLANKET.x + 1, y: BLANKET.y + 0.6, z: BLANKET.z });
  await expect.poll(() => row('loaf'), { timeout: 60_000 }).toBe(true);

  // the starters are served: the Guard arrives, and the main course opens on the note
  await expect.poll(() => logged('courseServed:1'), { timeout: 30_000 }).toBe(1);
  await expect.poll(() => l((x) => x.npcs.npcs.some((n) => n.role === 'marketguard')), { timeout: 30_000 }).toBe(true);
  // the new row is ??? until you go and look
  expect(await note()).not.toContain('Take the Market Guard');
  await gullTo({ x: 6, y: 5, z: -14 }, 'air');
  await expect.poll(note, { timeout: 30_000 }).toContain('Take the Market Guard');
  await page.screenshot({ path: 'tests/__screenshots__/picnic-lab-guard.png' });

  // a honk draws him over to look
  await l((x) => { const g = x.npcs.npcs.find((n) => n.role === 'marketguard')!; Object.assign(g, { x: 14, z: -8, patrol: null, stationary: false }); return 0; });
  await gullTo({ x: 14, y: 0.5, z: -26 }, 'ground', 0);
  await page.waitForTimeout(1500);
  await l((x) => { x.honkNow(); return 0; });
  await expect.poll(() => npc('marketguard').then((n) => n.goal), { timeout: 30_000, intervals: [200] }).toBe('noise');

  // he whistles at a gull he sees carrying his coffee: it goes back to his table
  await l((x) => { const g = x.npcs.npcs.find((n) => n.role === 'marketguard')!; Object.assign(g, { x: 6, z: -22, heading: Math.PI, goal: null, mode: 'idle', obliviousT: 0, distractT: 0, patrol: null, stationary: true }); return 0; });
  await gullTo({ x: 6, y: 0.5, z: -16 }, 'ground', 0);
  await l((x) => {
    const th = x.interaction.props.props.find((q) => q.tag === 'thermos')!;
    x.interaction.props.grab(th);
    x.interaction.beak(0).carried = th;
    return 0;
  });
  await expect.poll(() => logged('whistle:marketguard'), { timeout: 120_000, intervals: [100] }).toBeGreaterThan(0);
  expect(await l((x) => x.interaction.beak(0).carried)).toBeNull();
  const back = await l((x) => { const th = x.interaction.props.props.find((q) => q.tag === 'thermos')!; return Math.hypot(th.cur.p.x - 6, th.cur.p.z + 12); });
  expect(back).toBeLessThan(1.5);

  // delivered at last: the stage clears, and the card says where the minutes went
  await put('thermos', { x: BLANKET.x, y: BLANKET.y + 0.6, z: BLANKET.z + 1 });
  await expect.poll(() => row('thermos'), { timeout: 60_000 }).toBe(true);
  const lines = await l((x) => x.rowTimes.lines(['Starters', 'Main course']));
  expect(lines[0]).toContain('Time per row');
  expect(lines.filter((s) => /\+\d+:\d\d/.test(s))).toHaveLength(3);
  await expect.poll(() => page.locator('body').innerText(), { timeout: 60_000 }).toContain('Time per row');
  expect(errors).toEqual([]);
});
