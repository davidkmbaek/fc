import { AI_GK } from '../config';
import type { BallState } from './ball';
import { markTouch } from './dribble';
import type { PitchGeometry } from './pitch';
import type { PlayerState } from './player';
import type { Rng } from './rng';

/** 골키퍼 p가 자기 페널티 에어리어 안에 있는 공을 손으로 다룰 수 있는 위치인가 */
export function inOwnPenaltyArea(
  x: number,
  y: number,
  ownGoalX: number,
  geo: PitchGeometry,
): boolean {
  return (
    Math.abs(x - ownGoalX) <= geo.halfLength - geo.penaltyAreaX &&
    Math.abs(y) <= geo.penaltyAreaHalfWidth &&
    Math.sign(x) === Math.sign(ownGoalX)
  );
}

/**
 * 골키퍼 손 처리. DESIGN.md §7 골키퍼
 * 자기 페널티 에어리어 안, 손이 닿는 거리(다이빙 중이면 더 멀리)·높이의 공을
 * 느리면 잡고(heldBy), 빠르면 쳐낸다. 같은 팀이 마지막으로 찬 공(백패스)은 손으로 잡지 않는다.
 * 아주 빠른 공이 손끝에 닿으면 확률로 놓친다. 처리했으면 'catch' | 'parry'.
 */
export function goalkeeperHands(
  p: PlayerState,
  b: BallState,
  ownGoalX: number,
  geo: PitchGeometry,
  rng: Rng,
  time: number,
): 'catch' | 'parry' | null {
  if (p.role !== 'GK' || b.heldBy >= 0) return null;
  if (b.lastTouchTeam === p.team || b.z >= AI_GK.MAX_Z) return null;
  if (!inOwnPenaltyArea(b.x, b.y, ownGoalX, geo)) return null;
  const reach = p.action === 'slide' ? AI_GK.DIVE_REACH : AI_GK.REACH;
  const d = Math.hypot(b.x - p.x, b.y - p.y);
  if (d > reach) return null;

  const speed = Math.hypot(b.vx, b.vy, b.vz);
  if (speed >= AI_GK.MISS_SPEED && d > reach * AI_GK.MISS_EDGE && rng.next() < AI_GK.MISS_CHANCE) {
    return null;
  }
  markTouch(b, p, time);
  if (speed < AI_GK.CATCH_SPEED) {
    b.heldBy = p.id;
    b.heldTime = 0;
    b.vx = 0;
    b.vy = 0;
    b.vz = 0;
    return 'catch';
  }
  // 쳐내기: 골문 쪽 속도를 뒤집어 줄이고, 옆으로 튕긴다
  const awayX = -Math.sign(ownGoalX);
  b.vx = Math.abs(b.vx) * AI_GK.PARRY_KEEP * awayX;
  const side = rng.next() < 0.5 ? -1 : 1;
  b.vy = side * (AI_GK.PARRY_SIDE_MIN + (AI_GK.PARRY_SIDE_MAX - AI_GK.PARRY_SIDE_MIN) * rng.next());
  b.vz = Math.max(0, b.vz) * AI_GK.PARRY_KEEP;
  return 'parry';
}

/** 들고 있는 공을 골키퍼 손 위치에 둔다 (공 물리 대신) */
export function holdBall(b: BallState, holder: PlayerState, dt: number): void {
  b.x = holder.x + Math.cos(holder.facing) * 0.3;
  b.y = holder.y + Math.sin(holder.facing) * 0.3;
  b.z = AI_GK.HOLD_Z;
  b.vx = 0;
  b.vy = 0;
  b.vz = 0;
  b.heldTime += dt;
}
