import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Cand = { id: number };
type Npc = { id: number; role: string; x: number; z: number; holding: number | null; tugged: boolean; mode: string };
type Lk = {
  npcs: { npcs: Npc[]; snatchCandidates: (b: { x: number; y: number; z: number }) => Cand[]; tugCandidates: (b: { x: number; y: number; z: number }) => Cand[] };
  interaction: {
    updateGull: (id: number, s: unknown, i: unknown, dt: number, t: number) => { type: string }[];
    interruptTug: (id: number) => void;
    carried: { tag?: string } | null;
    props: { byId: (id: number) => { tag?: string; def: { name: string } } | undefined };
  };
  quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
  gull: { state: { x: number; y: number; z: number; vx: number; vy: number; vz: number; mode: string; heading: number } };
  tugProgress: number | null;
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;
const open = async (page: Page) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=tug-of-war&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return L(page);
};

test('Tug of War: which things can be tugged and which snatched', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page);
  // the soup (ground only): a tug can take it, a snatch from the air cannot
  const soup = await l((x) => { const n = x.npcs.npcs.find((m) => m.role === 'soupman')!; Object.assign(x.gull.state, { x: n.x, y: 0.5, z: n.z + 1.1, heading: 0, mode: 'ground' }); return { id: n.holding!, near: x.npcs.tugCandidates({ x: n.x, y: 0.5, z: n.z + 1.1 }).map((c) => c.id), air: x.npcs.snatchCandidates({ x: n.x, y: 1.1, z: n.z + 0.6 }).map((c) => c.id) }; });
  expect(soup.near).toContain(soup.id);
  expect(soup.air).not.toContain(soup.id);
  // the balloon (air only): a snatch can take it, a tug cannot
  const balloon = await l((x) => { const n = x.npcs.npcs.find((m) => m.role === 'balloonman')!; return { id: n.holding!, near: x.npcs.tugCandidates({ x: n.x, y: 0.5, z: n.z + 1.1 }).map((c) => c.id), air: x.npcs.snatchCandidates({ x: n.x, y: 1.1, z: n.z + 0.6 }).map((c) => c.id) }; });
  expect(balloon.near).not.toContain(balloon.id);
  // the bun (both)
  const bun = await l((x) => { const n = x.npcs.npcs.find((m) => m.role === 'bunman')!; return { id: n.holding!, near: x.npcs.tugCandidates({ x: n.x, y: 0.5, z: n.z + 1.1 }).map((c) => c.id) }; });
  expect(bun.near).toContain(bun.id);
  expect(errors).toEqual([]);
});

test('Tug of War: holding E tugs the soup out of his hands; a spray in the middle makes you lose', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page);
  // simulate the vendor's spray: start a tug on the bun man, then interrupt it
  await l((x) => { const n = x.npcs.npcs.find((m) => m.role === 'bunman')!; Object.assign(x.gull.state, { x: n.x, y: 0.5, z: n.z + 1.1, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'ground' }); return 0; });
  const started = await l((x) => { const e = x.interaction.updateGull(0, x.gull.state, { grab: true, grabHeld: true, toss: false, poop: false }, 1 / 60, 0); return e.map((g) => g.type); });
  expect(started).toContain('tugStart');
  expect(await l((x) => x.tugProgress)).not.toBeNull();
  const lost = await l((x) => { x.interaction.interruptTug(0); return x.interaction.updateGull(0, x.gull.state, { grab: false, grabHeld: true, toss: false, poop: false }, 1 / 60, 0.1).map((g) => g.type); });
  expect(lost).toContain('tugLost');
  expect(await l((x) => x.interaction.carried)).toBeNull();
  expect(await l((x) => x.npcs.npcs.find((m) => m.role === 'bunman')!.holding !== null)).toBe(true); // he kept it
  // now the soup, for real: stand beside the soup man and HOLD E
  await l((x) => { const n = x.npcs.npcs.find((m) => m.role === 'soupman')!; Object.assign(x.gull.state, { x: n.x, y: 0.5, z: n.z + 1.1, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'ground' }); return 0; });
  await page.waitForTimeout(2000); // the 1.2 s cooldown after the lost tug
  await page.keyboard.down('KeyE');
  await expect.poll(() => l((x) => x.quests.quests.find((q) => q.id === 'tugchain')!.objectives.find((o) => o.id === 'soup')!.done), { timeout: 90_000 }).toBe(true);
  await page.keyboard.up('KeyE');
  expect(await l((x) => x.interaction.carried?.tag)).toBe('tugSoup');
  expect(errors).toEqual([]);
});
