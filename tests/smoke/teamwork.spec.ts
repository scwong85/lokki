import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Link = { createInvite: () => Promise<string>; acceptInvite: (c: string) => Promise<string>; acceptAnswer: (c: string) => Promise<void> };
type GullState = { x: number; y: number; z: number; vx: number; vy: number; vz: number; mode: string; stunT: number };
type Lk = {
  PeerLink: new () => Link;
  startSession: (role: 'host' | 'guest', l: Link, level?: string) => void;
  level: string;
  players: { id: number; gull: { state: GullState; taunting: boolean; tangled: boolean } }[];
  interaction: { props: { spawn: (s: { type: string; x: number; y: number; z: number }) => { id: number } } };
  snapshot: () => { t: number };
  emotes: { active: number };
  puffs: { active: number; burst: (k: string, at: { x: number; y: number; z: number }) => void };
  passes: { chain: number; released: (id: number, by: number, now: number) => void };
  tangle: { caught: (i: number) => void; stuck: (i: number) => boolean };
  tram: { x: number } | null;
  quests: { quests: { id: string; objectives: { done: boolean; count: number }[] }[] };
};
const lk = (p: Page) => <T>(fn: (l: Lk, a?: unknown) => T, arg?: unknown) =>
  p.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;
const ready = (p: Page) => p.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });

test('emote keys pop a bubble over the gull, and particles spawn', async ({ page }) => {
  test.setTimeout(200_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?level=snack-attack&play');
  await ready(page);
  const L = lk(page);
  await page.keyboard.press('Digit1');
  await expect.poll(() => L((l) => l.emotes.active), { timeout: 60_000 }).toBeGreaterThan(0);
  await L((l) => l.puffs.burst('stars', { x: 0, y: 2, z: 0 }));
  expect(await L((l) => l.puffs.active)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('co-op: a throw is caught in mid-air by the partner, and a caught gull is pecked free', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?level=butterfingers&play&coop');
  await ready(page);
  const L = lk(page);
  expect(await L((l) => l.players.length)).toBe(2);
  // mid-air pass: player 1 "throws" an item right by the flying player 2
  await expect
    .poll(
      async () => {
        await L((l) => {
          Object.assign(l.players[1].gull.state, { x: 30, y: 14, z: -60, vx: 0, vy: 0, vz: 0, mode: 'air' });
          const prop = l.interaction.props.spawn({ type: 'bun', x: 30.4, y: 14, z: -60 });
          l.passes.released(prop.id, 0, l.snapshot().t);
        });
        await page.waitForTimeout(1500);
        return L((l) => l.passes.chain);
      },
      { timeout: 300_000, intervals: [500] },
    )
    .toBeGreaterThan(0);
  // rescue: player 1 is caught and stuck; the partner flies up and frees it
  await L((l) => {
    Object.assign(l.players[0].gull.state, { x: 0, y: 0.4, z: -80, vx: 0, vy: 0, vz: 0, mode: 'ground' });
    Object.assign(l.players[1].gull.state, { x: 40, y: 0.4, z: -80, vx: 0, vy: 0, vz: 0, mode: 'ground' });
    l.tangle.caught(0);
  });
  await expect.poll(() => L((l) => l.players[0].gull.tangled), { timeout: 60_000 }).toBe(true);
  await L((l) => { Object.assign(l.players[1].gull.state, { x: 1, y: 0.4, z: -80 }); });
  await expect.poll(() => L((l) => l.tangle.stuck(0)), { timeout: 60_000 }).toBe(false);
  expect(errors).toEqual([]);
});

test('online co-op: the guest sees the tram where the host has it', async ({ browser }) => {
  test.setTimeout(420_000);
  const ctx = await browser.newContext();
  const host = await ctx.newPage();
  const guest = await ctx.newPage();
  const errors: string[] = [];
  for (const p of [host, guest]) {
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto('/?level=snack-attack&play');
    await ready(p);
  }
  const H = lk(host), G = lk(guest);
  await H((l) => { (window as unknown as { hl: Link }).hl = new l.PeerLink(); return 0; });
  await G((l) => { (window as unknown as { gl: Link }).gl = new l.PeerLink(); return 0; });
  const invite = await host.evaluate(() => (window as unknown as { hl: Link }).hl.createInvite());
  const answer = await guest.evaluate((c) => (window as unknown as { gl: Link }).gl.acceptInvite(c), invite);
  await H((l) => l.startSession('host', (window as unknown as { hl: Link }).hl, 'tram-surfing'));
  await G((l) => l.startSession('guest', (window as unknown as { gl: Link }).gl));
  await host.evaluate((c) => (window as unknown as { hl: Link }).hl.acceptAnswer(c), answer);
  await expect.poll(() => G((l) => l.level), { timeout: 180_000 }).toBe('tram-surfing');
  // wait until the host's tram has left the end of the line, then the guest's copy must be near it
  await expect.poll(() => H((l) => l.tram!.x), { timeout: 240_000 }).toBeGreaterThan(-200);
  await expect.poll(async () => Math.abs((await G((l) => l.tram!.x)) - (await H((l) => l.tram!.x))), { timeout: 120_000 }).toBeLessThan(8);
  expect(errors).toEqual([]);
  await ctx.close();
});
