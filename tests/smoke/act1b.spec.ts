import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Prop = { type: string; tag?: string; body: { setTranslation: (v: { x: number; y: number; z: number }, w: boolean) => void; translation: () => { x: number; y: number; z: number } } };
type Lk = {
  level: string;
  notes: (n: unknown) => void;
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean; count: number }[] }[]; onEvent: (e: string) => unknown };
  npcs: { npcs: { role: string; mode: string; holding: number | null; x: number; z: number }[]; soakCone: (a: number, b: number, c: number, d: number) => unknown[] };
  defense: { response: { deployed: Set<string> }; warden: { mode: string } | null; lunch: unknown; vendors: unknown[] } | null;
  interaction: { props: { props: Prop[] } };
  gull: { state: Record<string, number | string> };
};
const lk = (p: Page) => <T>(fn: (l: Lk, a?: unknown) => T, arg?: unknown) =>
  p.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;
const open = async (page: Page, level: string) => {
  await page.goto(`/?level=${level}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return lk(page);
};
type Ask = ReturnType<typeof lk>;
const done = (L: Ask, q: string, o: string) => L((l, a) => { const [qq, oo] = a as [string, string]; return l.quests.quests.find((x) => x.id === qq)?.objectives.find((x) => x.id === oo)?.done ?? false; }, [q, o]);

test('level 5: the city starts on guard, and a vendor spray through the rich tourist soaks him and drops his lunch', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'city-strikes');
  expect(await L((l) => [...l.defense!.response.deployed].sort())).toEqual(['lines', 'vendors']);
  expect(await L((l) => l.npcs.npcs.some((n) => n.role === 'rich' && n.holding !== null))).toBe(true);
  await L((l) => l.npcs.soakCone(-35, -17, -33.2, -17)); // the vendor's spray, aimed through him
  await expect.poll(() => done(L, 'spray', 'soak'), { timeout: 120_000 }).toBe(true);
  expect(await L((l) => l.npcs.npcs.find((n) => n.role === 'rich')!.holding)).toBeNull();
  await L((l) => l.notes(l.quests.onEvent('grab:richLunch')));
  expect(await done(L, 'spray', 'lunch')).toBe(true);
  expect(errors).toEqual([]);
});

test('level 6: the owl scares the granny when it is near her, and she drops her bread', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'owl-be-back');
  expect([...(await L((l) => [...l.defense!.response.deployed]))].sort()).toEqual(['lines', 'nets', 'vendors']);
  await L((l) => l.notes(l.quests.onEvent('grab:owl')));
  await L((l) => l.interaction.props.props.find((p) => p.type === 'owl')!.body.setTranslation({ x: 22, y: 0.4, z: -19 }, true)); // beside the granny
  await expect.poll(() => done(L, 'owl', 'scare'), { timeout: 120_000 }).toBe(true);
  expect(await L((l) => l.npcs.npcs.find((n) => n.role === 'granny')!.holding)).toBeNull();
  await L((l) => l.notes(l.quests.onEvent('grab:grannyBread')));
  expect(await done(L, 'owl', 'bread')).toBe(true);
  expect(errors).toEqual([]);
});

test('level 7: the Warden goes for lunch (umbrella down), and the level says so', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'the-warden');
  expect(await L((l) => [...l.defense!.response.deployed])).toEqual(['warden']);
  await L((l) => {
    l.defense!.lunch = { x: -20, z: -10, from: 0, to: 1e9 }; // do not wait for the clock in a slow headless browser
    return 0;
  });
  await expect.poll(() => L((l) => l.defense!.warden?.mode), { timeout: 200_000 }).toBe('lunch');
  await expect.poll(() => done(L, 'lunch', 'wait'), { timeout: 60_000 }).toBe(true);
  expect(errors).toEqual([]);
});

test('level 8: a bottle dropped in the harbour drifts to the ferry and delivers the message', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'harbour-day');
  await L((l) => l.notes(l.quests.onEvent('grab:note'))); // picked it up: the horn countdown starts
  await L((l) => l.interaction.props.props.find((p) => p.tag === 'note')!.body.setTranslation({ x: -9, y: 0.5, z: 1 }, true)); // in the sea beside the quay
  await expect.poll(() => done(L, 'bottle', 'sea'), { timeout: 120_000 }).toBe(true);
  await expect.poll(() => done(L, 'bottle', 'ferry'), { timeout: 300_000 }).toBe(true);
  expect(errors).toEqual([]);
});
