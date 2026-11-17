import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Npc = { id: number; role: string; x: number; z: number; holding: number | null; holdType: string | null; mood: string; mode: string };
type Lk = {
  npcs: { npcs: Npc[]; onSnatched: (propId: number) => void; stations: { id: string }[] };
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean }[] }[] };
  interaction: { props: { props: { id: number; type: string; tag?: string; heldBy: number | null }[] } };
  level: string;
};
const L = (page: Page) => <T>(fn: (l: Lk) => T) =>
  page.evaluate((src) => new Function('l', `return (${src})(l)`)((window as unknown as { __lokki: Lk }).__lokki), fn.toString()) as Promise<Awaited<T>>;

test('C1 Map and Cone: snatch the map, the angry tourist is led to the stall, buys a cone, and the cone can be snatched', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=map-and-cone&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  const l = L(page);
  expect(await l((x) => x.level)).toBe('map-and-cone');
  expect(await l((x) => x.npcs.stations.map((s) => s.id))).toEqual(['iceStall']);
  expect(await l((x) => x.interaction.props.props.filter((p) => p.tag === 'stallCone').length)).toBe(2);
  const steps = () => l((x) => x.quests.quests.find((q) => q.id === 'mapcone')!.objectives.filter((o) => o.done).map((o) => o.id));
  expect(await steps()).toEqual([]);

  // step 1: the map is snatched; he is angry
  await l((x) => {
    const n = x.npcs.npcs.find((m) => m.role === 'mapper')!;
    x.npcs.onSnatched(n.holding!);
    return 0;
  });
  await expect.poll(steps, { timeout: 20_000 }).toEqual(['map']);
  expect(await l((x) => x.npcs.npcs.find((m) => m.role === 'mapper')!.mood)).toBe('angry');

  // step 2 and 3: he reaches the stall (the lure itself is covered by unit tests), is upset, buys a cone and is delighted
  await l((x) => {
    const n = x.npcs.npcs.find((m) => m.role === 'mapper')!;
    n.x = -8;
    n.z = -24;
    return 0;
  });
  await expect.poll(steps, { timeout: 60_000 }).toEqual(['map', 'lure', 'buy']);
  const m = await l((x) => {
    const n = x.npcs.npcs.find((q) => q.role === 'mapper')!;
    const prop = x.interaction.props.props.find((p) => p.id === n.holding);
    return { mood: n.mood, holding: prop?.type, tag: prop?.tag };
  });
  expect(m).toEqual({ mood: 'delighted', holding: 'icecream', tag: 'stallCone' });

  // step 4: the cone is snatched
  await l((x) => {
    const n = x.npcs.npcs.find((q) => q.role === 'mapper')!;
    x.npcs.onSnatched(n.holding!);
    return 0;
  });
  await expect.poll(steps, { timeout: 20_000 }).toEqual(['map', 'lure', 'buy', 'cone']);
  // the to-do shows the chain: done steps, the current one, and nothing spoiled
  await expect(page.locator('#todo')).toContainText('Treat yourself');
  expect(errors).toEqual([]);
});
