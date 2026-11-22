import { BALL } from '../config';
import type { BallState } from './ball';
import type { PitchGeometry } from './pitch';

const SIDES = [-1, 1] as const;

export type OutLine = 'touch' | 'goal';

export type Crossing =
  | { kind: 'goal'; side: 1 | -1 }
  | { kind: 'out'; line: OutLine; side: 1 | -1; x: number; y: number };

/**
 * 이번 (서브)스텝에 공 **전체**가 골라인·터치라인을 넘었는지. DESIGN.md §3 "판정"
 * 이전 위치 (px, py, pz)와 현재 위치를 이어 교차 지점을 구하므로 한 스텝에 라인을 건너뛰어도 놓치지 않는다.
 * - 골: |x| > 52.5 + r 이고, 교차 지점에서 |y| < 3.66 - r, z < 2.44 - r
 * - 그 밖에 골라인을 넘으면 골라인 아웃, |y| > 34 + r이면 터치라인 아웃
 */
export function detectCrossing(
  px: number,
  py: number,
  pz: number,
  b: BallState,
  geo: PitchGeometry,
): Crossing | null {
  const r = BALL.RADIUS;
  const lineX = geo.halfLength + r;
  const lineY = geo.halfWidth + r;

  for (const s of SIDES) {
    const pu = s * px;
    const u = s * b.x;
    if (pu <= lineX && u > lineX) {
      const t = (lineX - pu) / (u - pu);
      const yc = py + (b.y - py) * t;
      const zc = pz + (b.z - pz) * t;
      // 교차 지점이 이미 터치라인 밖이면 터치라인 판정이 먼저였어야 한다
      if (Math.abs(yc) > lineY) continue;
      if (Math.abs(yc) < geo.goalHalfWidth - r && zc < geo.goalHeight - r) {
        return { kind: 'goal', side: s };
      }
      return { kind: 'out', line: 'goal', side: s, x: s * geo.halfLength, y: yc };
    }
  }

  for (const s of SIDES) {
    const pv = s * py;
    const v = s * b.y;
    if (pv <= lineY && v > lineY) {
      const t = (lineY - pv) / (v - pv);
      const xc = px + (b.x - px) * t;
      if (Math.abs(xc) > lineX) continue;
      return { kind: 'out', line: 'touch', side: s, x: xc, y: s * geo.halfWidth };
    }
  }
  return null;
}
