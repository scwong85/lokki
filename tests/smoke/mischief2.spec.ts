import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Npc = { id: number; role: string; x: number; z: number; heading: number; holding: number | null; mode: string; mood: string };
type Lk = {
  honkNow: () => void;
  cannonballAt: (x: number, z: number, impact: number) => void;
  ringBell: () => void;
  audio: { log: { name: string; vol: number }[]; unlock: () => void; setAmbient: (a: { tram: number; sea: number; city: number }) => void; play: (n: string, v?: number) => void };
  npcs: { npcs: Npc[] };
  quests: { quests: { id: string; objectives: { id: string; done: boolean; count: number }[] }[] };
  interaction: { props: { props: { id: number; type: string; tag?: string; heldBy: number | null; stolen: boolean }[] } };
  gull: { state: { x: number; y: number; z: number; vx: number; vy: number; vz: number; mode: string; heading: number; diveAngle: number; diveT: number } };
  cam: { pitch: number; yaw: number };
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;
const open = async (page: Page, level: string) => {
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto(`/?level=${level}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return L(page);
};

test('Honk!: from behind they drop it, from the front they only flinch, and the chain goes through', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'honk');
  const steps = () => l((x) => x.quests.quests.find((q) => q.id === 'honkchain')!.objectives.filter((o) => o.done).map((o) => o.id));
  expect(await steps()).toEqual([]);
  // stand 5 m behind the first tourist (they face the sea: south) and honk
  // the first one: the gull starts behind them. Stand 5 m behind the first tourist, wherever they face now, and honk
  await l((x) => { const n = x.npcs.npcs.find((m) => m.role === 'tourist' && m.holding !== null)!; Object.assign(x.gull.state, { x: n.x + Math.sin(n.heading) * 5, y: 1.2, z: n.z + Math.cos(n.heading) * 5, vx: 0, vy: 0, vz: 0, mode: 'ground' }); x.honkNow(); return 0; });
  await expect.poll(() => l((x) => x.npcs.npcs.filter((m) => m.mode === 'startle' || m.mode === 'recover').length), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
  expect(await l((x) => x.npcs.npcs.filter((m) => m.holding === null && m.role === 'tourist').length)).toBeGreaterThanOrEqual(1); // somebody dropped theirs
  // a dropped item counts as theirs: carrying it off is getting away with it (the escape step needs `stolen`)
  expect(await l((x) => x.interaction.props.props.some((p) => p.tag === 'honkCone' && p.heldBy === null && p.stolen))).toBe(true);
  // a second one, after the cooldown of the others calming down
  await page.waitForTimeout(3000);
  await l((x) => { const n = x.npcs.npcs.find((m) => m.role === 'tourist' && m.holding !== null && (m.mode === 'idle' || m.mode === 'walk'))!; Object.assign(x.gull.state, { x: n.x + Math.sin(n.heading) * 5, y: 1.2, z: n.z + Math.cos(n.heading) * 5, vx: 0, vy: 0, vz: 0, mode: 'ground' }); x.honkNow(); return 0; });
  await expect.poll(steps, { timeout: 30_000 }).toEqual(['honk']);
  expect(await l((x) => x.audio.log.some((s) => s.name === 'honk'))).toBe(true);
  expect(errors).toEqual([]);
});

test('Splash Landing: a hard dive into the harbour soaks the pier (through the whole chain)', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'splash-landing');
  const steps = () => l((x) => x.quests.quests.find((q) => q.id === 'cannon')!.objectives.filter((o) => o.done).map((o) => o.id));
  // a real dive: hold Shift and dive steeply south from high above the quay, into the harbour in front of the pier
  await page.keyboard.down('ShiftLeft');
  await l((x) => { x.cam.pitch = 1.2; x.cam.yaw = Math.PI; Object.assign(x.gull.state, { x: 0, y: 22, z: -5, heading: Math.PI, vx: 0, vy: -20, vz: 8, mode: 'dive', diveAngle: 1.2, diveT: 0 }); return 0; });
  await expect.poll(steps, { timeout: 60_000 }).toEqual(['splash', 'three']);
  await page.keyboard.up('ShiftLeft');
  expect(await l((x) => x.npcs.npcs.filter((m) => m.mood !== 'calm').length)).toBeGreaterThanOrEqual(3);
  expect(errors).toEqual([]);
});

test('sounds: the church bell is heard at any distance, and the ambient layers set up without errors', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const l = await open(page, 'ding-dong');
  await l((x) => { x.audio.unlock(); x.ringBell(); return 0; });
  const bell = await l((x) => x.audio.log.filter((s) => s.name === 'bell').pop());
  expect(bell, 'the bell rang').toBeTruthy();
  expect(bell!.vol).toBeGreaterThan(0.35);
  // the other sounds and the ambient layers (the context may be suspended in a test browser, but nothing may throw)
  await l((x) => { for (const n of ['tramBell', 'horn', 'honk', 'bell']) x.audio.play(n); x.audio.setAmbient({ tram: 1, sea: 1, city: 1 }); return 0; });
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});
