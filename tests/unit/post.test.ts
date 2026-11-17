import { describe, expect, it } from 'vitest';
import { postActive } from '../../src/render/post';
import { defaultOptions, sanitizeOptions } from '../../src/core/options';
import { tuning } from '../../src/core/tuning';

describe('post look', () => {
  it('is only on for high graphics with the option on', () => {
    expect(postActive('high', true)).toBe(true);
    expect(postActive('high', false)).toBe(false);
    expect(postActive('low', true)).toBe(false);
  });
  it('can be switched off from tuning', () => {
    tuning.post.enabled.value = 0;
    expect(postActive('high', true)).toBe(false);
    tuning.post.enabled.value = 1;
  });
  it('the ink option defaults on and survives bad saves', () => {
    expect(defaultOptions().inkLook).toBe(true);
    expect(sanitizeOptions({ inkLook: false }).inkLook).toBe(false);
    expect(sanitizeOptions({ inkLook: 'x' }).inkLook).toBe(true);
    expect(sanitizeOptions(null).inkLook).toBe(true);
  });
});
