import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Npc = { id: number; role: string; x: number; z: number; holding: number | null; mode: string; following: boolean; mood: string };
type Lk = {
  npcs: { npcs: Npc[]; addHazard: (x: number, z: number, ttl?: number, r?: number) => void; followingCount: () => number };
  quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[]; onEvent: (e: string) => unknown };
  interaction: { props: { props: { id: number; type: string; tag?: string; heldBy: number | null }[] } };
  gull: { state: { x: number; y: number; z: number; vx: number; vy: number; vz: number; mode: string } };
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;
const open = async (page: Page, level: string) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto(`/?level=${level}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return L(page);
};

test('Wet Floor: a puddle on the route makes the pacing inspector slip, and his lunch is up for grabs', async ({ page }) => {
  test.setTimeout(360_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'wet-floor');
  const steps = () => l((x) => x.quests.quests.find((q) => q.id === 'wetfloor')!.objectives.filter((o) => o.done).map((o) => o.id));
  expect(await steps()).toEqual([]);
  // the splat zone along his route sets the trap (the splat event itself is covered by the zone data test)
  await l((x) => { x.quests.onEvent('trapSet'); return 0; });
  // put a puddle on his path a little ahead of where he is, and wait for him to walk into it
  await l((x) => { const n = x.npcs.npcs.find((m) => m.role === 'inspector')!; x.npcs.addHazard(n.x + 4, -20, 60, 2.5); x.npcs.addHazard(n.x - 4, -20, 60, 2.5); return 0; });
  await expect.poll(steps, { timeout: 300_000, intervals: [2000] }).toEqual(['trap', 'slip']); // he only walks half the time (the other half he eats), and the sim runs slowly in software rendering
  expect(await l((x) => x.npcs.npcs.find((m) => m.role === 'inspector')!.mood)).not.toBe('calm');
  // his lunch is on the ground (or being carried off by nobody): a free bun tagged for the quest exists
  expect(await l((x) => x.interaction.props.props.some((p) => p.tag === 'inspLunch' && p.heldBy === null))).toBe(true);
  await l((x) => { x.quests.onEvent('grab:inspLunch'); return 0; });
  await expect.poll(steps, { timeout: 20_000 }).toEqual(['trap', 'slip', 'lunch']);
  expect(errors).toEqual([]);
});

test('Pied Piper: taunting makes tourists follow, and the parade stops fire when they are there', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'pied-piper');
  const steps = () => l((x) => x.quests.quests.find((q) => q.id === 'piper')!.objectives.filter((o) => o.done).map((o) => o.id));
  expect(await steps()).toEqual([]);
  // stand among the bored tourists and hold T
  await l((x) => { Object.assign(x.gull.state, { x: -8, y: 1.2, z: -20, vx: 0, vy: 0, vz: 0, mode: 'ground' }); return 0; });
  await page.keyboard.down('KeyT');
  await expect.poll(() => l((x) => x.npcs.followingCount()), { timeout: 60_000 }).toBeGreaterThanOrEqual(4);
  await expect.poll(steps, { timeout: 30_000 }).toEqual(['gather']);
  await page.keyboard.up('KeyT');
  // the stops: bring the followers (and the gull) to each place
  for (const [x, z, step] of [[-22, -18, 'west'], [18, -18, 'east'], [0, -10, 'ferry']] as [number, number, string][]) {
    await page.keyboard.down('KeyT');
    await l((q, p) => {
      const [px, pz] = p as [number, number];
      Object.assign(q.gull.state, { x: px, y: 1.2, z: pz, vx: 0, vy: 0, vz: 0, mode: 'ground' });
      for (const n of q.npcs.npcs) if (n.following) { n.x = px + (n.id % 3) - 1; n.z = pz + 1.5; }
      return 0;
    }, [x, z] as [number, number]);
    await expect.poll(async () => (await steps()).includes(step), { timeout: 60_000 }).toBe(true);
    await page.keyboard.up('KeyT');
  }
  // sent to the wrong ferry: they arrive and the chain ends
  await expect.poll(steps, { timeout: 120_000 }).toEqual(['gather', 'west', 'east', 'ferry', 'wave']);
  expect(errors).toEqual([]);
});
