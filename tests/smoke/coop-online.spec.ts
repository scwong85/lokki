import { expect, test } from '@playwright/test';

type Link = { createInvite: () => Promise<string>; acceptInvite: (c: string) => Promise<string>; acceptAnswer: (c: string) => Promise<void> };
type Lk = {
  PeerLink: new () => Link;
  startSession: (role: 'host' | 'guest', l: Link) => void;
  loadLevel: (id: string) => void;
  level: string;
  gull: { state: { x: number; y: number; z: number } };
  players: { id: number; remote?: boolean; gull: { state: { x: number; y: number; z: number } } }[];
  interaction: { props: { props: { id: number; cur: { p: { x: number } } }[] } };
  net: { role: string } | null;
  defense: { addHeat: (r: string) => unknown; response: { deployed: Set<string> }; heat: { value: number } } | null;
};
const lk = (p: import('@playwright/test').Page) => <T>(fn: (l: Lk, a?: unknown) => T, arg?: unknown) =>
  p.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;

test('online co-op: the guest follows the host between levels, sees the host gull move, and the host sees the guest', async ({ browser }) => {
  test.setTimeout(420_000);
  const ctx = await browser.newContext();
  const host = await ctx.newPage();
  const guest = await ctx.newPage();
  const errors: string[] = [];
  for (const p of [host, guest]) {
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto('/?level=snack-attack&play');
    await p.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  }
  const H = lk(host), G = lk(guest);
  await H((l) => {
    (window as unknown as { hl: Link }).hl = new l.PeerLink();
    return 0;
  });
  await G((l) => {
    (window as unknown as { gl: Link }).gl = new l.PeerLink();
    return 0;
  });
  const invite = await host.evaluate(() => (window as unknown as { hl: Link }).hl.createInvite());
  const answer = await guest.evaluate((c) => (window as unknown as { gl: Link }).gl.acceptInvite(c), invite);
  await H((l) => l.startSession('host', (window as unknown as { hl: Link }).hl));
  await G((l) => l.startSession('guest', (window as unknown as { gl: Link }).gl));
  await host.evaluate((c) => (window as unknown as { hl: Link }).hl.acceptAnswer(c), answer);

  // the guest joins: both have two players, and the guest is told the level
  await expect.poll(() => H((l) => l.players.length), { timeout: 120_000 }).toBe(2);
  await expect.poll(() => G((l) => l.players.length), { timeout: 120_000 }).toBe(2);

  // the host moves; the guest's copy of the host gull follows
  await H((l) => {
    l.gull.state.x += 30;
    l.gull.state.y = 25;
    return 0;
  });
  const hostX = await H((l) => l.gull.state.x);
  await expect.poll(async () => Math.abs((await G((l) => l.players[1].gull.state.x)) - hostX), { timeout: 120_000 }).toBeLessThan(3);

  // the guest moves; the host's copy of the guest gull follows
  await G((l) => {
    l.gull.state.z -= 20;
    l.gull.state.y = 25;
    return 0;
  });
  const guestZ = await G((l) => l.gull.state.z);
  await expect.poll(async () => Math.abs((await H((l) => l.players[1].gull.state.z)) - guestZ), { timeout: 120_000 }).toBeLessThan(3);

  // the host picks another level without anyone reloading; the guest follows
  await H((l) => l.loadLevel('bombs-away'));
  await expect.poll(() => G((l) => l.level), { timeout: 120_000 }).toBe('bombs-away');
  expect(await G((l) => l.net?.role)).toBe('guest');

  // free play: the city's response (vendors, heat) reaches the guest too
  await H((l) => l.loadLevel('sandbox'));
  await expect.poll(() => G((l) => l.level), { timeout: 120_000 }).toBe('sandbox');
  await H((l) => {
    for (let i = 0; i < 12; i++) l.defense!.addHeat('snatch');
    return 0;
  });
  await expect.poll(() => G((l) => l.defense?.response.deployed.has('vendors') ?? false), { timeout: 120_000 }).toBe(true);
  expect(await G((l) => l.defense!.heat.value)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  await ctx.close();
});
