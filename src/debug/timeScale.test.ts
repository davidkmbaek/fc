import { describe, expect, it } from 'vitest';
import { nextTimeScale } from './timeScale';

const SCALES = [0.25, 0.5, 1];

describe('nextTimeScale', () => {
  it('한 칸씩 느리게·빠르게 바꾼다', () => {
    expect(nextTimeScale(1, -1, SCALES)).toBe(0.5);
    expect(nextTimeScale(0.5, -1, SCALES)).toBe(0.25);
    expect(nextTimeScale(0.25, 1, SCALES)).toBe(0.5);
  });

  it('양 끝에서는 그대로다', () => {
    expect(nextTimeScale(0.25, -1, SCALES)).toBe(0.25);
    expect(nextTimeScale(1, 1, SCALES)).toBe(1);
  });

  it('목록에 없는 값은 가장 빠른 단계에서 시작한다', () => {
    expect(nextTimeScale(0.7, -1, SCALES)).toBe(0.5);
  });
});
