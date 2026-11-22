import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type V3 = { x: number; y: number; z: number };
type Prop = { id: number; type: string; tag?: string; broken: boolean; body: { setTranslation(v: V3, w: boolean): void; setLinvel(v: V3, w: boolean): void } };
type Npc = { role: string; x: number; z: number; holding: number | null; mode: string; mood: string };
type Lk = {
  gate: { arc: number; stage: number } | null;
  defense: { vendors: unknown[] } | null;
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean }[] }[]; onEvent(e: string): unknown };
  notes(n: unknown): void;
  gull: { state: Record<string, unknown> };
  interaction: { props: { props: Prop[]; drop(p: Prop, v: V3): void } };
  npcs: { npcs: Npc[]; onSnatched(id: number): void; stations: { x: number; z: number }[] };
  picnicGuests: { count: number } | null;
  peckNow(): boolean;
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;

const ROOF = { x: -14, y: 4.8, z: -17 };

async function open(page: Page, level: string) {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true, hints: 'full' })));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`/?level=${level}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  const l = L(page);
  const status = (q: string) => l<string, string>((x, a) => x.quests.quests.find((m) => m.id === a)!.status, q);
  const row = (o: string) => l<boolean, string>((x, a) => x.quests.quests.find((m) => m.id === 'picnic')!.objectives.find((m) => m.id === a)!.done, o);
  /** somebody loses what is in their hand (as a snatch would take it), and it lies on the roof */
  const toRoof = (tag: string, dx = 0, dz = 0) => l<number, { tag: string; at: V3 }>((x, a) => {
    const p = x.interaction.props.props.find((q) => q.tag === a.tag && !q.broken)!;
    const n = x.npcs.npcs.find((m) => m.holding === p.id);
    if (n) n.holding = null;
    x.interaction.props.drop(p, { x: 0, y: 0, z: 0 });
    (p as unknown as { byGull: boolean }).byGull = true;
    p.body.setTranslation(a.at, true);
    p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    return 0;
  }, { tag, at: { x: ROOF.x + dx, y: ROOF.y + 0.6, z: ROOF.z + dz } });
  const gullTo = (p: V3, mode = 'ground') => l<number, { p: V3; mode: string }>((x, a) => { Object.assign(x.gull.state, { ...a.p, vx: 0, vy: 0, vz: 0, heading: 0, mode: a.mode }); return 0; }, { p, mode });
  const npc = (role: string) => l<{ x: number; z: number; mode: string }, string>((x, a) => { const n = x.npcs.npcs.find((m) => m.role === a)!; return { x: n.x, z: n.z, mode: n.mode }; }, role);
  const note = () => page.locator('#todo').innerText();
  const guests = () => l((x) => x.picnicGuests?.count);
  return { l, status, row, toRoof, gullTo, npc, note, guests };
}

test('1.3 Market Day Heist: six rows in three courses, the city on guard, the buttons far away', async ({ page }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const { l, status, row, toRoof, gullTo, note, guests } = await open(page, 'a1s3');
  expect(await l((x) => x.gate)).toEqual({ arc: 1, stage: 3 });
  await expect.poll(note, { timeout: 30_000 }).toContain('Market Day Heist 0 / 6');
  const text = await note();
  expect(text.toLowerCase()).toContain('casing the joint');
  expect(text).toContain('opens when one thing of the first course is lifted');
  expect(text).toContain('opens when one thing of the second course is lifted');
  expect(await l((x) => (x.defense?.vendors.length ?? 0) > 0)).toBe(true); // the city is on guard
  // a row of a closed course does not count
  await toRoof('tugBun', 1, 1);
  await page.waitForTimeout(1500);
  expect(await row('bun')).toBe(false);

  // the buttons are where they were moved to: a gull beside each can peck
  await gullTo({ x: 26, y: 0.5, z: -87.5 });
  await page.waitForTimeout(600);
  expect(await l((x) => x.peckNow())).toBe(true);
  await gullTo({ x: 46, y: 0.5, z: -87.5 });
  await page.waitForTimeout(600);
  expect(await l((x) => x.peckNow())).toBe(true);

  // course 1: one row opens the second course (the bun that was waiting there counts at once)
  await toRoof('booCone', 1, 1);
  await expect.poll(() => row('boo'), { timeout: 60_000 }).toBe(true);
  await expect.poll(() => row('bun'), { timeout: 60_000 }).toBe(true);
  // the third course is still closed (nothing of the second was lifted but the bun: that is one, so it opens)
  await toRoof('richLunch', -1, -1);
  await expect.poll(() => row('lunch'), { timeout: 60_000 }).toBe(true);
  await toRoof('tugBalloon', 1, -1);
  await expect.poll(() => row('balloon'), { timeout: 60_000 }).toBe(true);
  await toRoof('tugSoup', -1, 1);
  await expect.poll(() => row('soup'), { timeout: 60_000 }).toBe(true);
  await toRoof('btnCone', 0, 1.5);
  await expect.poll(() => row('queue'), { timeout: 60_000 }).toBe(true);
  expect(await guests()).toBe(6);
  await expect.poll(note, { timeout: 20_000 }).toContain('6 / 6');
  await expect.poll(() => status('picnicGong'), { timeout: 20_000 }).toBe('active');
  await gullTo({ x: ROOF.x + 4.4, y: ROOF.y + 0.6, z: ROOF.z - 1.2 });
  await page.waitForTimeout(500);
  expect(await l((x) => x.peckNow())).toBe(true);
  await expect.poll(() => status('picnicGong'), { timeout: 20_000 }).toBe('won');
  expect(errors).toEqual([]);
});

test('1.4 One Bad Afternoon: the lure and the stall, the jukebox, the bell, four rows in two courses', async ({ page }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const { l, status, row, toRoof, gullTo, npc, note, guests } = await open(page, 'a1s4');
  expect(await l((x) => x.gate)).toEqual({ arc: 1, stage: 4 });
  await expect.poll(note, { timeout: 30_000 }).toContain('One Bad Afternoon 0 / 4');
  expect((await note()).toLowerCase()).toContain('sour grapes');

  // the Lost Tourist: robbed he is angry; at the stall (moved far away) he buys a cone, and that cone is the row's
  await l((x) => { const n = x.npcs.npcs.find((m) => m.role === 'mapper')!; x.npcs.onSnatched(n.holding!); return 0; });
  expect(await l((x) => x.npcs.npcs.find((m) => m.role === 'mapper')!.mood)).toBe('angry');
  await l((x) => { const n = x.npcs.npcs.find((m) => m.role === 'mapper')!; const st = x.npcs.stations[0]; n.x = st.x; n.z = st.z + 0.5; return 0; });
  await expect.poll(() => l((x) => { const n = x.npcs.npcs.find((m) => m.role === 'mapper')!; const p = x.interaction.props.props.find((q) => q.tag === 'moodCone'); return !!p && n.holding === (p as unknown as { id: number }).id; }), { timeout: 90_000, intervals: [500] }).toBe(true);
  // a cone off the counter is not his: it does not count
  expect(await l((x) => x.interaction.props.props.filter((q) => q.type === 'icecream' && q.tag === undefined).length)).toBeGreaterThan(0);
  await toRoof('moodCone', -1, 1);
  await expect.poll(() => row('mapper'), { timeout: 60_000 }).toBe(true);
  await toRoof('inspLunch', 1, 1);
  await expect.poll(() => row('inspector'), { timeout: 60_000 }).toBe(true);
  await expect.poll(() => npc('passenger').then((n) => !!n), { timeout: 20_000 }).toBe(true); // the ferry crowd of the second course

  // the jukebox moved with its crowd: pecking it starts the dancing
  await gullTo({ x: 34, y: 0.5, z: -77 });
  await page.waitForTimeout(600);
  expect(await l((x) => x.peckNow())).toBe(true);
  await expect.poll(() => l((x) => x.npcs.npcs.some((n) => n.mode === 'dance')), { timeout: 60_000, intervals: [500] }).toBe(true);
  // the bell moved too: the waiter comes running
  const w0 = await npc('waiter');
  await gullTo({ x: 0, y: 0.5, z: -71 });
  await page.waitForTimeout(600);
  expect(await l((x) => x.peckNow())).toBe(true);
  await expect.poll(() => npc('waiter').then((n) => Math.hypot(n.x - w0.x, n.z - w0.z)), { timeout: 90_000, intervals: [500] }).toBeGreaterThan(3);
  await toRoof('danceCone', -1, -1);
  await expect.poll(() => row('dancer'), { timeout: 60_000 }).toBe(true);
  await toRoof('bellBun', 1, -1);
  await expect.poll(() => row('waiter'), { timeout: 60_000 }).toBe(true);
  expect(await guests()).toBe(4);
  await expect.poll(() => status('picnicGong'), { timeout: 20_000 }).toBe('active');
  await gullTo({ x: ROOF.x + 4.4, y: ROOF.y + 0.6, z: ROOF.z - 1.2 });
  await page.waitForTimeout(500);
  expect(await l((x) => x.peckNow())).toBe(true);
  await expect.poll(() => status('picnicGong'), { timeout: 20_000 }).toBe('won');
  expect(errors).toEqual([]);
});

test('1.5 The Warden: three rows, then the boss', async ({ page }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const { l, status, row, toRoof, gullTo, note } = await open(page, 'a1s5');
  expect(await l((x) => x.gate)).toEqual({ arc: 1, stage: 5 });
  await expect.poll(note, { timeout: 30_000 }).toContain('The Warden\'s Day 0 / 3');
  expect(await status('nemesis')).not.toBe('won');
  await toRoof('rushCone', -1, 1);
  await expect.poll(() => row('rush'), { timeout: 60_000 }).toBe(true);
  await toRoof('strikeCone', 1, 1);
  await expect.poll(() => row('strike'), { timeout: 60_000 }).toBe(true);
  // the tablecloth moved with its table: a yank makes the goods fly, and they carry the tag
  await gullTo({ x: -6, y: 0.5, z: -77.5 });
  await page.waitForTimeout(600);
  expect(await l((x) => x.peckNow())).toBe(true);
  await expect.poll(() => l((x) => x.interaction.props.props.some((q) => q.tag === 'clothBun')), { timeout: 30_000 }).toBe(true);
  await toRoof('clothBun', 0, -1.5);
  await expect.poll(() => row('cloth'), { timeout: 60_000 }).toBe(true);
  await expect.poll(() => status('picnic'), { timeout: 20_000 }).toBe('won');
  // the boss chain opens: the Warden's lunch
  await expect.poll(() => status('nemesis'), { timeout: 20_000 }).toBe('active');
  await page.screenshot({ path: 'tests/__screenshots__/warden-day.png' });
  expect(errors).toEqual([]);
});
