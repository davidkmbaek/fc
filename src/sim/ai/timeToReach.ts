import { PLAYER } from '../../config';
import { angleDiff } from '../math/angle';
import type { PlayerState } from '../player';
import { turnRate } from '../player';

/**
 * 선수가 (x, y)의 reach(m) 안까지 가는 데 걸리는 시간(초)의 근사. DESIGN.md §7
 * = 행동 불가 남은 시간 + 방향 전환 시간 + (현재 속력에서 최고 속도까지 가속하며) 달리는 시간.
 * "가장 가까운 선수"는 거리 대신 항상 이 값으로 판단한다.
 * - sprint: 최고 속도를 SPRINT_SPEED로 (AI가 공을 쫓거나 압박할 때)
 * - reach: 이 거리 안에 들어가면 도착으로 본다 (공을 컨트롤할 수 있는 거리 등)
 */
export function timeToReach(
  p: PlayerState,
  x: number,
  y: number,
  sprint = false,
  reach = 0,
): number {
  const busy = p.action === 'none' ? 0 : Math.max(0, p.actionTime);
  const dx = x - p.x;
  const dy = y - p.y;
  const d = Math.max(0, Math.hypot(dx, dy) - reach);
  if (d < 1e-6) return busy;

  const turn = Math.abs(angleDiff(p.facing, Math.atan2(dy, dx)));
  const turnTime = turn / turnRate(0);
  // 돌아서면 속력이 대부분 사라진다고 보고, 앞을 보고 있을 때만 현재 속력을 살린다
  const v0 = p.action === 'none' ? Math.max(0, p.speed * Math.cos(turn)) : 0;
  const vMax = sprint ? PLAYER.SPRINT_SPEED : PLAYER.RUN_SPEED;
  const accelTime = Math.max(0, (vMax - v0) / PLAYER.ACCEL);
  const accelDist = ((v0 + vMax) / 2) * accelTime;
  const runTime =
    d <= accelDist
      ? (-v0 + Math.sqrt(v0 * v0 + 2 * PLAYER.ACCEL * d)) / PLAYER.ACCEL
      : accelTime + (d - accelDist) / vMax;
  return busy + turnTime + runTime;
}
