import { expect, test } from '@playwright/test';

type V = { x: number; y: number; z: number; clone(): V; sub(o: V): V; normalize(): V; dot(o: V): number; length(): number };
type Lk = {
  quests: { onEvent(e: string): unknown[]; tick(a: unknown): unknown[] };
  notes(n: unknown): void;
  outro: { phase: string };
  cam: { camera: { position: V } };
  gull: { mesh: { getWorldDirection(v: V): V }; position: V; state: { mode: string } };
};
const L = (page: import('@playwright/test').Page) => <T>(fn: (x: Lk) => T) =>
  page.evaluate((src) => new Function('x', `return (${src})(x)`)((window as unknown as { __lokki: Lk }).__lokki), fn.toString()) as Promise<Awaited<T>>;

test('clearing a level plays the victory run: the gull lands and runs at a camera that backs away, then the card shows', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=snack-attack&outro');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  const l = L(page);
  await l((x) => {
    x.notes(x.quests.onEvent('snatch:icecream'));
    for (let i = 0; i < 400; i++) x.notes(x.quests.tick({ dt: 1 / 60, carryingStolen: true, nearestNpc: 99 }));
    x.notes(x.quests.onEvent('feast'));
    return 0;
  });
  await expect(page.locator('#levelcomplete')).toBeHidden(); // the card waits for the run
  await page.waitForFunction(() => (window as unknown as { __lokki: Lk }).__lokki.outro.phase === 'run', null, { timeout: 40_000 });
  await page.waitForTimeout(1200);
  const view = await l((x) => {
    const g = x.gull.mesh.getWorldDirection(x.cam.camera.position.clone()); // local +z of the gull in the world
    const facing = { x: -g.x, y: -g.y, z: -g.z }; // the model faces -z
    const toCam = x.cam.camera.position.clone().sub(x.gull.position);
    const dist = toCam.length();
    toCam.normalize();
    return { facing: facing.x * toCam.x + facing.z * toCam.z, dist, mode: x.gull.state.mode };
  });
  expect(view.mode).toBe('ground');
  expect(view.facing).toBeGreaterThan(0.8); // the gull faces the camera
  expect(view.dist).toBeGreaterThan(2.5);
  expect(view.dist).toBeLessThan(7);
  await page.screenshot({ path: 'tests/__screenshots__/m42-outro.png' });
  await page.keyboard.press('Space'); // skip
  await expect(page.locator('#levelcomplete')).toBeVisible({ timeout: 10_000 });
  // the card sits at the right edge and leaves the view free
  const box = await page.locator('#levelcomplete .lc-card').boundingBox();
  const vp = page.viewportSize()!;
  expect(box!.x).toBeGreaterThan(vp.width * 0.5);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width);
  await page.screenshot({ path: 'tests/__screenshots__/m46-card.png' });
  expect(errors).toEqual([]);
});
