import { PLAYER } from '../../config';
import { angleDiff } from '../math/angle';
import type { PlayerState } from '../player';
import { turnRate } from '../player';

/**
 * 선수가 (x, y)까지 가는 데 걸리는 시간(초)의 근사. DESIGN.md §7
 * 간이 버전(2.3): 방향 전환 시간 + 현재 속력에서 RUN_SPEED까지 가속하며 달리는 시간.
 * 3.1에서 테스트를 보강하며 다듬는다. "가장 가까운 선수"는 거리 대신 항상 이 값으로 판단한다.
 */
export function timeToReach(p: PlayerState, x: number, y: number): number {
  const dx = x - p.x;
  const dy = y - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return 0;

  const turn = Math.abs(angleDiff(p.facing, Math.atan2(dy, dx)));
  const turnTime = turn / turnRate(0);
  // 돌아서면 속력이 대부분 사라진다고 보고, 앞을 보고 있을 때만 현재 속력을 살린다
  const v0 = Math.max(0, p.speed * Math.cos(turn));
  const vMax = PLAYER.RUN_SPEED;
  const accelTime = Math.max(0, (vMax - v0) / PLAYER.ACCEL);
  const accelDist = ((v0 + vMax) / 2) * accelTime;
  const runTime =
    d <= accelDist
      ? (-v0 + Math.sqrt(v0 * v0 + 2 * PLAYER.ACCEL * d)) / PLAYER.ACCEL
      : accelTime + (d - accelDist) / vMax;
  return turnTime + runTime;
}
