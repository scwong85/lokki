import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type V3 = { x: number; y: number; z: number };
type Prop = { id: number; type: string; tag?: string; body: { setTranslation(v: V3, w: boolean): void; setLinvel(v: V3, w: boolean): void } };
type Npc = { role: string; x: number; z: number; holding: number | null };
type PropsApi = { props: Prop[]; drop(p: Prop, v: V3): void };
type Lk = {
  gate: { arc: number; stage: number } | null;
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean }[] }[]; onEvent(e: string): unknown };
  notes(n: unknown): void;
  gull: { state: Record<string, unknown> };
  interaction: { props: PropsApi };
  npcs: { npcs: Npc[] };
  picnicGuests: { count: number } | null;
  peckNow(): boolean;
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;

const ROOF = { x: -14, y: 4.8, z: -17 };

test('1.1 First Light, Breakfast on the Roof: four rows in two courses, the dockhand lure, the ferry, the gong', async ({ page }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true, hints: 'full' })));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?level=a1s1&play');
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
  // somebody loses what is in their hand (as a snatch would take it), then it is put on the roof
  const take = (tag: string, at: V3) => l<number, { tag: string; at: V3 }>((x, a) => {
    const p = x.interaction.props.props.find((q) => q.tag === a.tag)!;
    const n = x.npcs.npcs.find((m) => m.holding === p.id);
    if (n) n.holding = null;
    x.interaction.props.drop(p, { x: 0, y: 0, z: 0 });
    (p as unknown as { byGull: boolean }).byGull = true; // a gull took it: it is not the owner's to take back
    p.body.setTranslation(a.at, true);
    p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    return 0;
  }, { tag, at });
  const gullTo = (p: V3, mode = 'ground') => l<number, { p: V3; mode: string }>((x, a) => { Object.assign(x.gull.state, { ...a.p, vx: 0, vy: 0, vz: 0, heading: 0, mode: a.mode }); return 0; }, { p, mode });
  const npc = (role: string) => l<{ x: number; z: number; holding: number | null }, string>((x, a) => { const n = x.npcs.npcs.find((m) => m.role === a)!; return { x: n.x, z: n.z, holding: n.holding }; }, role);
  const note = () => page.locator('#todo').innerText();
  const onRoof = (tag: string, dx = 0, dz = 0) => put(tag, { x: ROOF.x + dx, y: ROOF.y + 0.6, z: ROOF.z + dz });

  expect(await l((x) => x.gate)).toEqual({ arc: 1, stage: 1 });
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['picnic', 'picnicGong', 'map']);
  await expect.poll(note, { timeout: 30_000 }).toContain('Breakfast on the Roof 0 / 5');
  const text = await note();
  expect(text.toLowerCase()).toContain('early birds');
  expect(text).toContain('opens when the early birds are served');

  // the four people are where they should be, with their things in hand
  for (const role of ['selfie', 'dockhand', 'sleeper']) expect((await npc(role)).holding, role).not.toBeNull();
  // course 2 is closed: a thermos on the roof does not count yet
  await onRoof('thermos');
  await page.waitForTimeout(1500);
  expect(await row('thermos')).toBe(false);
  await put('thermos', { x: -6.8, y: 0.6, z: -9.3 }); // back on the captain's table

  // the dockhand: the bun from the far bench, dropped on his spotless quay, sends him to scold it
  const before = await npc('dockhand');
  await put('benchBun', { x: -78, y: 0.4, z: -56.5 });
  await expect.poll(() => npc('dockhand').then((n) => Math.hypot(n.x - before.x, n.z - before.z)), { timeout: 120_000, intervals: [500] }).toBeGreaterThan(2.5);
  // the cone and the sandwich on the roof: course one is served
  await take('selfieCone', { x: ROOF.x + (-1), y: ROOF.y + 0.6, z: ROOF.z + (1) });
  await expect.poll(() => row('cone'), { timeout: 60_000 }).toBe(true);
  await take('dockLunch', { x: ROOF.x + (1), y: ROOF.y + 0.6, z: ROOF.z + (1) });
  await expect.poll(() => row('lunch'), { timeout: 60_000 }).toBe(true);
  // the second course opens: the ferry crowd and a note line
  await expect.poll(() => l((x) => x.npcs.npcs.some((n) => n.role === 'passenger')), { timeout: 20_000 }).toBe(true);
  expect(await l((x) => x.picnicGuests?.count)).toBe(2);

  // the captain walks to the gangway when the ferry comes in
  await l((x) => { x.notes(x.quests.onEvent('ferryIn')); return 0; });
  await expect.poll(() => npc('captain').then((n) => Math.hypot(n.x - 0, n.z + 6.6)), { timeout: 120_000, intervals: [500] }).toBeLessThan(2.5);
  await onRoof('thermos', 1, -1);
  await expect.poll(() => row('thermos'), { timeout: 60_000 }).toBe(true);
  await take('sunHat', { x: ROOF.x + (-1), y: ROOF.y + 0.6, z: ROOF.z + (-1) });
  await expect.poll(() => row('hat'), { timeout: 60_000 }).toBe(true);
  // the Lost Tourist paces his beat far to the north: a moving target, with the map in his hand
  const lost0 = await npc('lost');
  await expect.poll(() => npc('lost').then((n) => Math.hypot(n.x - lost0.x, n.z - lost0.z)), { timeout: 60_000, intervals: [500] }).toBeGreaterThan(3);
  await take('lostMap', { x: ROOF.x + 1, y: ROOF.y + 0.6, z: ROOF.z + 1 });
  await expect.poll(() => row('souvenir'), { timeout: 60_000 }).toBe(true);
  expect(await l((x) => x.picnicGuests?.count)).toBe(5);
  await expect.poll(note, { timeout: 20_000 }).toContain('5 / 5');

  // the gong
  await expect.poll(() => status('picnicGong'), { timeout: 20_000 }).toBe('active');
  await gullTo({ x: ROOF.x + 4.4, y: ROOF.y + 0.6, z: ROOF.z - 1.2 });
  await page.waitForTimeout(500);
  expect(await l((x) => x.peckNow())).toBe(true);
  await expect.poll(() => status('picnicGong'), { timeout: 20_000 }).toBe('won');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/__screenshots__/first-light-breakfast.png' });
  expect(errors).toEqual([]);
});
