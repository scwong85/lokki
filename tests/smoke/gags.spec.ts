import { expect, test } from '@playwright/test';

type Lokki = {
  gull: { state: { x: number; y: number; z: number; vx: number; vy: number; vz: number; heading: number; mode: string } };
  cam: { yaw: number; pitch: number };
  interaction: { carried: { def: { name: string } } | null };
  quests: { quests: { id: string; objectives: { id: string; done: boolean }[] }[] };
};

test('smashing a bottle does not crash or freeze the game (regression: removed Rapier body was read)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // count animation frames so a frozen render loop is detectable
  await page.addInitScript(() => {
    let n = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (f) => raf((t) => { n++; f(t); });
    (window as unknown as { __raf: () => number }).__raf = () => n;
  });
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });

  const place = (x: number, y: number, z: number) =>
    page.evaluate(([x, y, z]) => {
      const { gull, cam } = (window as unknown as { __lokki: Lokki }).__lokki;
      const s = gull.state;
      Object.assign(s, { x, y, z, vx: 0, vy: 0, vz: 0, heading: 0, mode: y > 1 ? 'air' : 'ground' });
      cam.yaw = 0;
      cam.pitch = 0.3;
    }, [x, y, z]);
  const frames = () => page.evaluate(() => (window as unknown as { __raf: () => number }).__raf());

  await place(0, 0.5, -75.6); // in front of the sandbox bottles
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as unknown as { __lokki: Lokki }).__lokki.interaction.carried?.def.name)).toBe('bottle');

  await place(0, 9, -75.6);
  await page.waitForTimeout(100);
  await page.keyboard.press('KeyE'); // drop it from 9 m
  // wait for the bottle to land and shatter (the headless renderer is slow, so wait on the condition, not on a fixed time)
  await page.waitForFunction(
    () => (window as unknown as { __lokki: Lokki }).__lokki.quests.quests.find((q) => q.id === 'extras')!.objectives.find((o) => o.id === 'bottle')!.done,
    null,
    { timeout: 20_000 },
  );
  const a = await frames();
  await page.waitForTimeout(1000);
  expect(await frames()).toBeGreaterThan(a); // the render loop is still alive after the crash
  expect(errors).toEqual([]);
});
