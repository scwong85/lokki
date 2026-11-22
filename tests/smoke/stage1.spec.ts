import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  gate: { arc: number; stage: number } | null;
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean }[] }[] };
  gull: { state: Record<string, unknown> };
  interaction: { updateGull: (id: number, s: unknown, i: unknown, dt: number, t: number) => { type: string }[]; carried: { tag?: string } | null; props: { props: { tag?: string }[] } };
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;
const done = (l: ReturnType<typeof L>, q: string, o: string) => l((x, a) => x.quests.quests.find((m) => m.id === a![0])!.objectives.find((m) => m.id === a![1])!.done, [q, o] as never);

test('stage 1.1: gated to flying and snatching, three objectives, the bun chain runs on real triggers and the dockhand reacts', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=first-light-v1&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  const l = L(page);
  expect(await l((x) => x.gate)).toEqual({ arc: 1, stage: 1 });
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['breakfast', 'map', 'neighbours']);
  // pick up the bun by the bench (E)
  await l((x) => { Object.assign(x.gull.state, { x: -10, y: 0.5, z: -13.4, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'ground' }); return 0; });
  await page.waitForTimeout(1500);
  await page.keyboard.press('KeyE');
  await expect.poll(() => done(l, 'neighbours', 'bun'), { timeout: 20_000, intervals: [500] }).toBe(true);
  // put it down on the dockhand's spotless quay: he gets angry and walks over to it (the world reacts)
  await l((x) => { Object.assign(x.gull.state, { x: 6, y: 0.5, z: -10.5, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'ground' }); return 0; });
  for (let k = 0; k < 10 && !(await done(l, 'neighbours', 'mess')); k++) {
    await page.waitForTimeout(1500);
    await page.keyboard.press('KeyE'); // the grab cooldown runs on game time, which is slow here: press again until it lets go
  }
  await expect.poll(() => done(l, 'neighbours', 'mess'), { timeout: 30_000, intervals: [500] }).toBe(true);
  await expect.poll(() => l((x) => { const d = (x as unknown as { npcs: { npcs: { role: string; x: number; z: number }[] } }).npcs.npcs.find((n) => n.role === 'dockhand')!; return Math.hypot(d.x - 6, d.z + 10.5); }), { timeout: 120_000, intervals: [500] }).toBeLessThan(4);
  expect(errors).toEqual([]);
});

test('the level list puts the campaign first and the Playground behind a button', async ({ page }) => {
  test.setTimeout(200_000);
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=a1s1&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  await page.waitForTimeout(2500);
  await page.keyboard.press('KeyL');
  await expect(page.locator('#levelselect .ls-district').first()).toBeVisible({ timeout: 20_000 });
  const heads = await page.locator('#levelselect .ls-district').allTextContents();
  expect(heads[0]).toContain('Act 1');
  expect(heads.some((h) => h.includes('Free play'))).toBe(true);
  expect(heads.some((h) => h.includes('Playground'))).toBe(false); // the old levels are one button, not headings
  await page.locator('#levelselect [data-view=playground]').click();
  expect((await page.locator('#levelselect .ls-district').allTextContents()).some((h) => h.includes('Playground'))).toBe(true);
});
