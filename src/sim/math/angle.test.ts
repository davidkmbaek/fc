import { describe, expect, it } from 'vitest';
import { angleDiff, degToRad, rotateToward, wrapAngle } from './angle';

describe('angle', () => {
  it('wrapAngle은 (-π, π]로 맞춘다', () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(Math.PI / 2 + 4 * Math.PI)).toBeCloseTo(Math.PI / 2);
  });

  it('angleDiff는 가장 짧은 방향을 고른다', () => {
    expect(angleDiff(degToRad(170), degToRad(-170))).toBeCloseTo(degToRad(20));
    expect(angleDiff(degToRad(-170), degToRad(170))).toBeCloseTo(degToRad(-20));
  });

  it('rotateToward는 최대 회전량을 넘지 않고, 가까우면 목표에 맞춘다', () => {
    expect(rotateToward(0, Math.PI / 2, 0.1)).toBeCloseTo(0.1);
    expect(rotateToward(0, -Math.PI / 2, 0.1)).toBeCloseTo(-0.1);
    expect(rotateToward(0, 0.05, 0.1)).toBeCloseTo(0.05);
    expect(rotateToward(degToRad(175), degToRad(-175), degToRad(20))).toBeCloseTo(degToRad(-175));
  });
});
