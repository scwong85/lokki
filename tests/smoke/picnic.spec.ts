import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type V3 = { x: number; y: number; z: number };
type Prop = { id: number; type: string; tag?: string; heldBy: number | null; carried: boolean; cur: { p: V3 }; body: { setTranslation(v: V3, w: boolean): void; setLinvel(v: V3, w: boolean): void; translation(): V3 } };
type Npc = { role: string; x: number; z: number; obliviousT: number; holding: number | null };
type Lk = {
  gate: { arc: number; stage: number } | null;
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean }[] }[]; onEvent(e: string): unknown };
  notes(n: unknown): void;
  gull: { state: Record<string, unknown> };
  interaction: { props: { props: Prop[] }; gates: Record<string, boolean> };
  npcs: { npcs: Npc[] };
  gang: { mode: string } | null;
  picnicGuests: { count: number } | null;
  honkNow(): void;
  peckNow(): boolean;
  scene: { getObjectByName(n: string): unknown };
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;

const PICNIC = { x: -14, y: 4.2, z: -17 };

test('1.2 The Gull Picnic: rows found on the spot, six tricks, the raid, the gong', async ({ page }) => {
  test.setTimeout(1_500_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true, hints: 'full' })));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?level=a1s2&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  const l = L(page);
  const status = (q: string) => l((x, a) => x.quests.quests.find((m) => m.id === a)!.status, q as never);
  const row = (o: string) => l((x, a) => x.quests.quests.find((m) => m.id === 'picnic')!.objectives.find((m) => m.id === a)!.done, o as never);
  const put = (tag: string, at: V3) => l<number, { tag: string; at: V3 }>((x, a) => {
    const p = x.interaction.props.props.find((q) => q.tag === a.tag)!;
    p.body.setTranslation(a.at, true);
    p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    return p.id;
  }, { tag, at });
  const gullTo = (p: V3, mode = 'ground', heading = 0) => l<number, { p: V3; mode: string; heading: number }>((x, a) => { Object.assign(x.gull.state, { ...a.p, vx: 0, vy: 0, vz: 0, heading: a.heading, mode: a.mode }); return 0; }, { p, mode, heading });
  const npc = (role: string) => l((x, a) => { const n = x.npcs.npcs.find((m) => m.role === a)!; return { x: n.x, z: n.z, ob: n.obliviousT, holding: n.holding }; }, role as never);
  const note = () => page.locator('#todo').innerText();

  expect(await l((x) => x.gate)).toEqual({ arc: 1, stage: 2 });
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['picnic', 'raid', 'picnicGong', 'freak', 'honkchain', 'bottleService', 'grannyScarf', 'oldBoot']);
  // the note: the goal, six ??? rows, the side orders below
  await expect.poll(note, { timeout: 20_000 }).toContain('The Gull Picnic 0 / 6');
  expect(((await note()).match(/\?\?\?/g) ?? []).length).toBeGreaterThanOrEqual(6);
  expect((await note()).toLowerCase()).toContain('side orders');

  // 1. the Waiter: near him the row shows the wish; his flourish throws the cloth up and he catches it again
  await gullTo({ x: -26, y: 0.5, z: -16 });
  await expect.poll(note, { timeout: 20_000 }).toContain('Borrow the Waiter');
  await expect.poll(() => l((x) => { const p = x.interaction.props.props.find((q) => q.tag === 'waiterCloth')!; return p.heldBy === null && p.cur.p.y > 2; }), { timeout: 240_000, intervals: [100] }).toBe(true);
  await expect.poll(() => npc('waiter').then((n) => n.holding !== null), { timeout: 60_000 }).toBe(true);
  // serve it the next time it is in the air
  await expect.poll(() => l((x) => x.interaction.props.props.find((q) => q.tag === 'waiterCloth')!.heldBy === null), { timeout: 240_000, intervals: [100] }).toBe(true);
  await put('waiterCloth', { x: PICNIC.x - 1, y: PICNIC.y + 0.6, z: PICNIC.z });
  await expect.poll(() => row('cloth'), { timeout: 60_000 }).toBe(true);

  // 2. the Baker: a bottle dropped on the door bell rings it and she walks over
  await l((x) => {
    const b = x.interaction.props.props.find((q) => q.type === 'bottle' && Math.hypot(q.cur.p.x + 2, q.cur.p.z + 10.5) < 2)!;
    b.body.setTranslation({ x: -6.6, y: 3.2, z: -12.2 }, true);
    b.body.setLinvel({ x: 0, y: -9, z: 0 }, true);
    return 0;
  });
  await expect.poll(() => npc('baker').then((n) => Math.hypot(n.x + 5.2, n.z + 12.2)), { timeout: 120_000, intervals: [500] }).toBeLessThan(3);
  await put('rye', { x: PICNIC.x + 1, y: PICNIC.y + 0.6, z: PICNIC.z });
  await expect.poll(() => row('loaf'), { timeout: 60_000 }).toBe(true);

  // 3. the Fisherman: a splat in the water by the float is a bite; the second one brings up a boot
  for (let i = 1; i <= 2; i++) {
    await gullTo({ x: 11.5, y: 7, z: -2.8 }, 'air');
    await page.keyboard.press('f');
    await expect.poll(() => npc('fisher').then((n) => n.ob), { timeout: 20_000, intervals: [200] }).toBeGreaterThan(0);
    await page.waitForTimeout(3000);
  }
  await expect.poll(() => l((x) => x.interaction.props.props.some((q) => q.tag === 'oldBoot')), { timeout: 20_000 }).toBe(true);
  await put('catch', { x: PICNIC.x, y: PICNIC.y + 0.6, z: PICNIC.z + 1 });
  await expect.poll(() => row('herring'), { timeout: 60_000 }).toBe(true);
  // the raid starts at three rows
  await expect.poll(() => status('raid'), { timeout: 20_000 }).toBe('active');
  expect(await l((x) => x.gang?.mode)).toBe('guarding');
  await page.screenshot({ path: 'tests/__screenshots__/picnic-raid.png' });

  // 4. the Captain greets the ferry
  await l((x) => { x.notes(x.quests.onEvent('ferryIn')); return 0; });
  await expect.poll(() => npc('captain').then((n) => Math.hypot(n.x - 0, n.z + 6.6)), { timeout: 120_000, intervals: [500] }).toBeLessThan(2.5);
  await put('thermos', { x: PICNIC.x - 1, y: PICNIC.y + 0.6, z: PICNIC.z + 1 });
  await expect.poll(() => row('thermos'), { timeout: 60_000 }).toBe(true);

  // 5. the berries (the sight puzzle is unit-tested; here just the serving)
  await put('punnet', { x: PICNIC.x + 1, y: PICNIC.y + 0.6, z: PICNIC.z + 1 });
  await expect.poll(() => row('berries'), { timeout: 60_000 }).toBe(true);

  // 6. the Nervous Diner: a honk from behind drops the cone
  await gullTo({ x: 6, y: 0.5, z: -16.8 }, 'ground', Math.PI);
  await page.waitForTimeout(800);
  await l((x) => { x.honkNow(); return 0; });
  await expect.poll(() => npc('diner').then((n) => n.holding), { timeout: 20_000, intervals: [200] }).toBeNull();
  await put('dinerCone', { x: PICNIC.x, y: PICNIC.y + 0.6, z: PICNIC.z - 1 });
  await expect.poll(() => row('vendace'), { timeout: 60_000 }).toBe(true);
  await expect.poll(note, { timeout: 20_000 }).toContain('6 / 6');
  expect(await l((x) => x.picnicGuests?.count)).toBe(6); // a guest gull landed for every row

  // the raid: a honk on the roof
  await gullTo({ x: PICNIC.x + 2, y: PICNIC.y + 0.6, z: PICNIC.z + 2 });
  await page.waitForTimeout(500);
  await l((x) => { x.honkNow(); return 0; });
  await expect.poll(() => status('raid'), { timeout: 20_000 }).toBe('won');
  // the gong
  await expect.poll(() => status('picnicGong'), { timeout: 20_000 }).toBe('active');
  await gullTo({ x: PICNIC.x + 4.4, y: PICNIC.y + 0.6, z: PICNIC.z - 1.2 });
  await page.waitForTimeout(500);
  expect(await l((x) => x.peckNow())).toBe(true);
  await expect.poll(() => status('picnicGong'), { timeout: 20_000 }).toBe('won');
  // the victims gather under the roof
  await expect.poll(() => npc('baker').then((n) => Math.hypot(n.x + 7, n.z + 11)), { timeout: 180_000, intervals: [1000] }).toBeLessThan(3);
  await gullTo({ x: PICNIC.x + 6, y: PICNIC.y + 5, z: PICNIC.z + 16 }, 'air', 0.3);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'tests/__screenshots__/picnic-feast.png' });
  expect(errors).toEqual([]);
});
