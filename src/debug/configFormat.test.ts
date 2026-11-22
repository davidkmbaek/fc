import { describe, expect, it } from 'vitest';
import { formatTunables } from './configFormat';

describe('formatTunables', () => {
  it('섹션을 config.ts 형식의 코드로 만든다', () => {
    expect(formatTunables({ BALL: { GRAVITY: 9.81, AIR_DRAG: 0.013 } })).toBe(
      'export const BALL = {\n  GRAVITY: 9.81,\n  AIR_DRAG: 0.013,\n};',
    );
  });

  it('부동소수 잡음을 지운다', () => {
    expect(formatTunables({ A: { X: 1.5000000001 } })).toContain('X: 1.5,');
  });

  it('여러 섹션은 빈 줄로 구분한다', () => {
    expect(formatTunables({ A: { X: 1 }, B: { Y: 2 } })).toBe(
      'export const A = {\n  X: 1,\n};\n\nexport const B = {\n  Y: 2,\n};',
    );
  });
});
