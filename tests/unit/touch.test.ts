import { describe, expect, it } from 'vitest';
import { knobOffset, stickAxes, wantsTouch } from '../../src/core/touchMath';
import { grabLabel } from '../../src/ui/touchControls';
import { Input } from '../../src/core/input';

describe('touch maths', () => {
  it('stick: dead zone, ramp, clamp, screen-y down means forward', () => {
    expect(stickAxes(3, 2, 56, 7)).toEqual({ x: 0, y: 0 });
    const up = stickAxes(0, -56, 56, 7);
    expect(up.x).toBeCloseTo(0);
    expect(up.y).toBeCloseTo(1);
    const far = stickAxes(200, 0, 56, 7);
    expect(far.x).toBeCloseTo(1);
    const half = stickAxes(0, 31.5, 56, 7);
    expect(half.y).toBeCloseTo(-0.5);
    expect(Math.hypot(...Object.values(stickAxes(40, 40, 56, 7)))).toBeLessThanOrEqual(1.0001);
  });

  it('knob stays inside the ring', () => {
    expect(knobOffset(10, 0, 56)).toEqual({ x: 10, y: 0 });
    const k = knobOffset(300, 400, 56);
    expect(Math.hypot(k.x, k.y)).toBeCloseTo(56);
  });

  it('touch mode: coarse pointer with touch points, or forced by the URL', () => {
    expect(wantsTouch('', true, 5)).toBe(true);
    expect(wantsTouch('', false, 5)).toBe(false); // laptop with a touch screen and a mouse
    expect(wantsTouch('?touch', false, 0)).toBe(true);
    expect(wantsTouch('?notouch', true, 5)).toBe(false);
  });

  it('grab button label follows the prompt', () => {
    expect(grabLabel('E grab cinnamon bun')).toEqual({ text: 'Grab cinnamon bun', enabled: true });
    expect(grabLabel('E drop · Q toss map')).toEqual({ text: 'Drop', enabled: true });
    expect(grabLabel('chair: too heavy').enabled).toBe(false);
    expect(grabLabel('').enabled).toBe(false);
  });
});

describe('virtual input', () => {
  // Input only needs addEventListener on the canvas and window in its constructor
  const g = globalThis as unknown as { addEventListener?: unknown; document?: unknown };
  g.addEventListener ??= () => undefined;
  g.document ??= { addEventListener: () => undefined };
  const make = () => new Input({ addEventListener: () => undefined } as unknown as HTMLElement);

  it('held virtual buttons are down and press once; taps press for one step', () => {
    const i = make();
    i.setVirtual('Space', true);
    expect(i.isDown('Space')).toBe(true);
    expect(i.wasPressed('Space')).toBe(true);
    i.endStep();
    expect(i.wasPressed('Space')).toBe(false);
    i.setVirtual('Space', false);
    expect(i.isDown('Space')).toBe(false);
    i.tap('KeyE');
    expect(i.wasPressed('KeyE')).toBe(true);
    i.endStep();
    expect(i.wasPressed('KeyE')).toBe(false);
  });

  it('the stick drives the axes when no movement key is down; look deltas add up', () => {
    const i = make();
    i.setStick(0.3, -0.8);
    expect(i.axes()).toEqual({ x: 0.3, y: -0.8 });
    i.addLook(5, -2);
    i.addLook(1, 1);
    expect(i.consumeMouse()).toEqual({ dx: 6, dy: -1 });
    i.releaseVirtual();
    expect(i.axes()).toEqual({ x: 0, y: 0 });
  });
});
