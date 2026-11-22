import { describe, expect, it } from 'vitest';
import { BALL } from '../config';
import { createBall } from './ball';
import { detectCrossing } from './lines';
import { computePitchGeometry } from './pitch';

const geo = computePitchGeometry();
const R = BALL.RADIUS;

/** (px, py, pz)에서 (x, y, z)로 움직였을 때의 판정 */
function cross(px: number, py: number, pz: number, x: number, y: number, z: number) {
  const b = createBall(x, y);
  b.z = z;
  return detectCrossing(px, py, pz, b, geo);
}

describe('detectCrossing — 골', () => {
  it('공 전체가 골라인을 넘어야 골이다', () => {
    expect(cross(52.5, 0, 0, 52.55, 0, 0)).toBeNull(); // 일부만 넘음
    expect(cross(52.55, 0, 0, 52.5 + R + 0.01, 0, 0)).toEqual({ kind: 'goal', side: 1 });
  });

  it('반대쪽 골문도 판정한다', () => {
    expect(cross(-52.5, 1, 0, -52.7, 1, 0)).toEqual({ kind: 'goal', side: -1 });
  });

  it('크로스바 위로 넘어가면 골이 아니라 골라인 아웃이다', () => {
    const c = cross(52, 0, 2.5, 53, 0, 2.5);
    expect(c).toMatchObject({ kind: 'out', line: 'goal', side: 1 });
  });

  it('포스트 바깥으로 넘어가면 골라인 아웃이다', () => {
    expect(cross(52, 5, 0, 53, 5, 0)).toMatchObject({ kind: 'out', line: 'goal', side: 1 });
  });

  it('한 스텝에 라인을 건너뛰는 빠른 공도 교차 지점으로 판정한다', () => {
    // 52m에서 60m로 한 번에: 교차 지점 y는 0 (골)
    expect(cross(52, 0, 0, 60, 0, 0)).toEqual({ kind: 'goal', side: 1 });
    // 같은 거리지만 교차 지점이 포스트 밖이면 아웃
    expect(cross(50, 10, 0, 60, 0, 0)).toMatchObject({ kind: 'out', line: 'goal' });
  });

  it('골라인을 이미 넘은 공이 더 움직여도 다시 판정하지 않는다', () => {
    expect(cross(53, 0, 0, 54, 0, 0)).toBeNull();
  });
});

describe('detectCrossing — 터치라인', () => {
  it('공 전체가 터치라인을 넘으면 터치라인 아웃', () => {
    expect(cross(10, 34, 0, 10, 34.05, 0)).toBeNull();
    expect(cross(10, 34.05, 0, 10, 34 + R + 0.01, 0)).toMatchObject({
      kind: 'out',
      line: 'touch',
      side: 1,
    });
    expect(cross(-20, -33, 0, -20, -35, 0)).toMatchObject({ kind: 'out', line: 'touch', side: -1 });
  });

  it('공중 볼도 판정한다 (높이와 무관)', () => {
    expect(cross(0, 33, 5, 0, 35, 5)).toMatchObject({ kind: 'out', line: 'touch' });
  });
});
