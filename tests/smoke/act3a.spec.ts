import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Body = { setTranslation: (v: { x: number; y: number; z: number }, w: boolean) => void };
type Prop = { type: string; tag?: string; body: Body };
type Lk = {
  notes: (n: unknown) => void;
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean; count: number }[] }[]; onEvent: (e: string) => unknown };
  gull: { isWater: unknown; state: Record<string, number | string | boolean> };
  interaction: { props: { props: Prop[] }; updateGull: (id: number, s: unknown, i: unknown, dt: number, t: number) => unknown };
  npcs: { npcs: { role: string }[] };
  defense: { response: { deployed: Set<string> } } | null;
};
type Ask = <T>(fn: (l: Lk, a?: unknown) => T, arg?: unknown) => Promise<Awaited<T>>;
const lk = (p: Page): Ask => (fn, arg) => p.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as never;
const open = async (page: Page, level: string) => {
  await page.goto(`/?level=${level}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return lk(page);
};
const done = (L: Ask, q: string, o: string) => L((l, a) => { const [qq, oo] = a as [string, string]; return l.quests.quests.find((x) => x.id === qq)?.objectives.find((x) => x.id === oo)?.done ?? false; }, [q, o]);

test('level 15: balloons float over the square and a poop pops one', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'vappu-eve');
  expect(await L((l) => l.npcs.npcs.filter((n) => n.role === 'student').length)).toBeGreaterThanOrEqual(10);
  expect(await L((l) => l.interaction.props.props.filter((p) => p.type === 'balloon').length)).toBe(7);
  expect(await L((l) => [...l.defense!.response.deployed])).toEqual(['warden']);
  await page.waitForTimeout(2000);
  // a gull right above a balloon lets one go
  const at = await L((l) => { const b = l.interaction.props.props.find((p) => p.type === 'balloon')!; return b.body as unknown as { translation: () => { x: number; y: number; z: number } }; }).then(() => L((l) => { const b = l.interaction.props.props.find((p) => p.type === 'balloon')!.body as unknown as { translation: () => { x: number; y: number; z: number } }; const t = b.translation(); return { x: t.x, y: t.y, z: t.z }; }));
  expect(at.y).toBeGreaterThan(1.5); // it floats instead of lying on the ground
  await L((l, a) => {
    const t = a as { x: number; z: number };
    Object.assign(l.gull.state, { x: t.x, z: t.z, y: 9, mode: 'air', vx: 0, vy: 0, vz: 0 });
    l.interaction.updateGull(0, l.gull.state, { grab: false, toss: false, poop: true }, 1 / 60, 0);
    return 0;
  }, at);
  await expect.poll(() => done(L, 'balloons', 'pop').then(async (d) => d || (await L((l) => l.quests.quests.find((q) => q.id === 'balloons')!.objectives[0].count)) >= 1), { timeout: 120_000 }).toBe(true);
  expect(errors).toEqual([]);
});

test('level 16: the fisherman and the soup stall are in place (the chain itself is played in chains.spec)', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'herring-market');
  expect(await L((l) => l.quests.quests.map((q) => q.id))).toEqual(['jars', 'sour']);
  expect(await L((l) => l.interaction.props.props.filter((p) => p.type === 'soup').length)).toBeGreaterThanOrEqual(2);
});

test('level 17: the bride and the flower stall are in place (the chain itself is played in chains.spec)', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'wedding-bells');
  expect(await L((l) => l.quests.quests.map((q) => q.id))).toEqual(['ring', 'photo']);
  expect(await L((l) => l.interaction.props.props.filter((p) => p.type === 'flowers').length)).toBeGreaterThanOrEqual(2);
});

test('level 18: the harbour is ice: no swimming, you stand on it', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'frozen-harbour');
  expect(await L((l) => l.gull.isWater)).toBeNull();
  await L((l) => Object.assign(l.gull.state, { x: 0, z: 7, y: 0.5, mode: 'ground', vx: 0, vz: 0, vy: 0 }));
  await page.waitForTimeout(4000);
  expect(await L((l) => l.gull.state.overWater)).toBe(false);
  expect(await L((l) => l.interaction.props.props.filter((p) => p.tag === 'munkki').length)).toBe(2);
});
