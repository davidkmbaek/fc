import { describe, expect, it } from 'vitest';
import { rollDistance, rollSpeedForDistance, rollTime } from './rolling';

const A = 2.0;
const B = 0.25;

describe('rolling 해석해', () => {
  it('DESIGN.md 참고값: 15 m/s는 약 26m, 22 m/s는 약 46m 굴러간다', () => {
    expect(rollDistance(15, 0, A, B)).toBeCloseTo(26.2, 0);
    expect(rollDistance(22, 0, A, B)).toBeCloseTo(46, 0);
  });

  it('v0 = v1이면 시간·거리 0', () => {
    expect(rollTime(5, 5, A, B)).toBe(0);
    expect(rollDistance(5, 5, A, B)).toBe(0);
  });

  it('rollSpeedForDistance는 rollDistance의 역함수다', () => {
    for (const d of [3, 10, 20, 35]) {
      const v0 = rollSpeedForDistance(d, 5, A, B, 40);
      expect(rollDistance(v0, 5, A, B)).toBeCloseTo(d, 6);
    }
  });

  it('최대 속도로도 닿지 않으면 최대 속도를 돌려준다', () => {
    expect(rollSpeedForDistance(500, 0, A, B, 30)).toBe(30);
  });

  it('거리가 0 이하면 도착 속도 그대로', () => {
    expect(rollSpeedForDistance(0, 5, A, B, 30)).toBe(5);
  });
});
