import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Npc = { id: number; role: string; x: number; z: number; holding: number | null; mood: string; craves: string | null };
type Lk = {
  interaction: { props: { props: { type: string; broken: boolean }[] } };
  npcs: { npcs: Npc[]; owners: Npc[]; onSnatched: (id: number) => void; onPooped: (i: number) => string | undefined; stations: { id: string; x: number; z: number; r: number }[] };
  quests: { quests: { id: string; chain?: boolean; objectives: { id: string; done: boolean }[] }[] };
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;

/** level id, the chain quest id, the person's role, and how they are provoked */
const CHAINS: [string, string, string, 'snatch' | 'splat'][] = [
  ['vappu-eve', 'caprace', 'lars', 'splat'],
  ['herring-market', 'jars', 'fisher', 'snatch'],
  ['wedding-bells', 'ring', 'bride', 'snatch'],
  ['frozen-harbour', 'plunge', 'plunger', 'splat'],
  ['new-look', 'wardrobe', 'hardhat', 'splat'],
];

for (const [level, quest, role, provoke] of CHAINS) {
  test(`chain ${level}: provoke, lead to the stall, they buy, the goods can be snatched`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
    await page.goto(`/?level=${level}&play`);
    await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
    const l = L(page);
    const steps = () => l((x, q) => x.quests.quests.find((m) => m.id === q)!.objectives.filter((o) => o.done).map((o) => o.id), quest);
    expect(await steps()).toEqual([]);

    if (provoke === 'snatch') {
      await l((x, r) => { const n = x.npcs.npcs.find((m) => m.role === r)!; x.npcs.onSnatched(n.holding!); return 0; }, role);
    } else {
      await l((x, r) => { const n = x.npcs.npcs.find((m) => m.role === r)!; x.npcs.owners.push(n); x.npcs.onPooped(x.npcs.owners.length - 1); return 0; }, role);
      expect(await l((x, r) => x.npcs.npcs.find((m) => m.role === r)!.mood, role)).toBe('annoyed');
      await l((x, r) => { const n = x.npcs.npcs.find((m) => m.role === r)!; x.npcs.owners.push(n); x.npcs.onPooped(x.npcs.owners.length - 1); return 0; }, role);
    }
    await expect.poll(steps, { timeout: 30_000 }).toEqual(['provoke']);
    expect(await l((x, r) => x.npcs.npcs.find((m) => m.role === r)!.mood, role)).toBe('angry');

    // the goods on the counter are all gone (taken or smashed): the stall restocks, so the level cannot get stuck
    await l((x) => { const st = x.npcs.stations[0] as unknown as { sells: string }; for (const p of x.interaction.props.props) if (p.type === st.sells) p.broken = true; return 0; });
    // they reach the stall (leading them with T is covered by unit tests), buy and are delighted
    await l((x, r) => { const n = x.npcs.npcs.find((m) => m.role === r)!; const st = x.npcs.stations[0]; n.x = st.x; n.z = st.z + 0.5; return 0; }, role);
    await expect.poll(steps, { timeout: 90_000 }).toEqual(['provoke', 'lure', 'buy']);
    expect(await l((x, r) => x.npcs.npcs.find((m) => m.role === r)!.mood, role)).toBe('delighted');
    expect(await l((x, r) => x.npcs.npcs.find((m) => m.role === r)!.holding !== null, role)).toBe(true);

    await l((x, r) => { const n = x.npcs.npcs.find((m) => m.role === r)!; x.npcs.onSnatched(n.holding!); return 0; }, role);
    await expect.poll(steps, { timeout: 30_000 }).toEqual(['provoke', 'lure', 'buy', 'take']);
    expect(errors).toEqual([]);
  });
}
