import { AI } from '../../config';
import type { PlayerIntent } from '../intent';
import type { PlayerState } from '../player';

/** 의도의 행동 입력을 비운다 (이동은 그대로) */
export function clearActions(i: PlayerIntent): void {
  i.kick = null;
  i.tackle = null;
  i.switchPlayer = false;
}

export function stop(i: PlayerIntent): void {
  i.moveX = 0;
  i.moveY = 0;
  i.sprint = false;
}

/**
 * (tx, ty)로 가는 이동 의도. 가까우면 감속(SLOW_RADIUS), 도착하면 멈춤(ARRIVE_EPS).
 * sprint가 true면 멀 때(SPRINT_DIST 이상) 또는 force면 항상 스프린트.
 */
export function moveTo(
  i: PlayerIntent,
  p: PlayerState,
  tx: number,
  ty: number,
  sprint: boolean,
  force = false,
): void {
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy);
  if (d < AI.ARRIVE_EPS) {
    stop(i);
    return;
  }
  const mag = Math.min(1, d / AI.SLOW_RADIUS);
  i.moveX = (dx / d) * mag;
  i.moveY = (dy / d) * mag;
  i.sprint = sprint && (force || d > AI.SPRINT_DIST);
}
