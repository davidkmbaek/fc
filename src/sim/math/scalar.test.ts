import { describe, expect, it } from 'vitest';
import { clamp, lerp } from './scalar';

describe('lerp', () => {
  it('t=0이면 a, t=1이면 b, t=0.5면 가운데', () => {
    expect(lerp(2, 10, 0)).toBe(2);
    expect(lerp(2, 10, 1)).toBe(10);
    expect(lerp(2, 10, 0.5)).toBe(6);
  });

  it('a > b여도 동작한다', () => {
    expect(lerp(10, 2, 0.25)).toBe(8);
  });
});

describe('clamp', () => {
  it('범위 밖 값을 경계로 자른다', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(0.3, 0, 1)).toBe(0.3);
  });
});
