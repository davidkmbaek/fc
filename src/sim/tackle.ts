import { AI_GK, DRIBBLE, PLAYER, TACKLE } from '../config';
import type { BallState } from './ball';
import { markTouch, possessorId } from './dribble';
import { angleDiff } from './math/angle';
import { clamp } from './math/scalar';
import type { PlayerAction, PlayerState } from './player';
import type { Rng } from './rng';

function setAction(p: PlayerState, action: PlayerAction, time: number): void {
  p.action = action;
  p.actionTime = time;
}

/**
 * 스탠딩 태클 성공 확률. DESIGN.md §4
 * 거리 항목(가까울수록 1, 범위 끝에서 MIN_DIST_FACTOR) × 각도 항목(공 가진 선수의 정면에서 1, 등 뒤에서 BEHIND_FACTOR)
 */
export function standTackleChance(
  tackler: PlayerState,
  ballDist: number,
  carrier?: PlayerState,
): number {
  const distFactor =
    TACKLE.STAND_MIN_DIST_FACTOR +
    (1 - TACKLE.STAND_MIN_DIST_FACTOR) * (1 - clamp(ballDist / TACKLE.STAND_RANGE, 0, 1));
  let angleFactor = 1;
  if (carrier) {
    const fromCarrier = Math.atan2(tackler.y - carrier.y, tackler.x - carrier.x);
    const off = Math.abs(angleDiff(carrier.facing, fromCarrier)) / Math.PI; // 0 정면 ~ 1 등 뒤
    angleFactor = 1 - (1 - TACKLE.STAND_BEHIND_FACTOR) * off;
  }
  return TACKLE.STAND_BASE_CHANCE * distFactor * angleFactor;
}

/**
 * 스탠딩 태클 시도. 범위 안의 공을 상대가 가지고 있으면 확률로, 아무도 없으면 그냥 빼앗는다.
 * 성공하면 공을 태클한 선수 발밑(빼앗긴 선수 반대쪽)으로 가져오고, 빼앗긴 선수는 BEATEN_TIME 동안 공을 못 건드린다.
 * 실패(범위 밖 포함)하면 STAND_FAIL_STUN초 행동 불가.
 */
export function standTackle(
  p: PlayerState,
  players: readonly PlayerState[],
  b: BallState,
  rng: Rng,
  time: number,
): 'won' | 'failed' {
  const d = Math.hypot(b.x - p.x, b.y - p.y);
  // 골키퍼가 손에 든 공은 뺏을 수 없다
  const inRange = d <= TACKLE.STAND_RANGE && b.z < DRIBBLE.CONTROL_MAX_Z && b.heldBy < 0;
  const owner = players[possessorId(players, b)];
  const carrier = owner && owner.team !== p.team ? owner : undefined;
  const won = inRange && rng.next() < (carrier ? standTackleChance(p, d, carrier) : 1);
  if (!won) {
    setAction(p, 'stunned', TACKLE.STAND_FAIL_STUN);
    return 'failed';
  }
  // 공을 빼앗긴 선수 반대쪽(태클한 선수 뒤쪽) 발밑으로 가져온다.
  // 앞쪽에 두면 공 가진 선수의 몸·컨트롤 범위 안이라 바로 되찾긴다. 공 가진 선수가 없으면 앞쪽
  let ux = Math.cos(p.facing);
  let uy = Math.sin(p.facing);
  if (carrier) {
    const d = Math.hypot(p.x - carrier.x, p.y - carrier.y);
    if (d > 1e-6) {
      ux = (p.x - carrier.x) / d;
      uy = (p.y - carrier.y) / d;
    }
  }
  b.x = p.x + ux * TACKLE.STAND_BALL_OFFSET;
  b.y = p.y + uy * TACKLE.STAND_BALL_OFFSET;
  b.vx = p.vx;
  b.vy = p.vy;
  b.vz = 0;
  b.z = 0;
  markTouch(b, p, time);
  if (carrier) carrier.cooldown = TACKLE.BEATEN_TIME;
  return 'won';
}

/** 슬라이딩 시작: 보는 방향(입력이 있으면 입력 방향)으로 SLIDE_DIST만큼 미끄러진다 */
export function startSlide(p: PlayerState, dirX: number, dirY: number): void {
  if (Math.hypot(dirX, dirY) >= PLAYER.MOVE_DEADZONE) p.facing = Math.atan2(dirY, dirX);
  // 골키퍼의 슬라이딩 = 다이빙 (손으로 처리: goalkeeping.ts)
  const gk = p.role === 'GK';
  const speed = gk ? AI_GK.DIVE_SPEED : TACKLE.SLIDE_SPEED;
  p.speed = speed;
  p.slideHitBall = false;
  setAction(p, 'slide', (gk ? AI_GK.DIVE_DIST : TACKLE.SLIDE_DIST) / speed);
}

/**
 * 슬라이딩 한 스텝 (이동 + 접촉). 반환: 'ball' 공을 쳐냄, 'fall' 사람을 먼저 맞혀 둘 다 넘어짐, null 아무 일 없음.
 * 공을 맞힌 뒤에는 사람과 부딪혀도 넘어뜨리지 않는다 (파울 도입 전까지).
 */
export function stepSlide(
  p: PlayerState,
  players: readonly PlayerState[],
  b: BallState,
  dt: number,
  time: number,
): 'ball' | 'fall' | null {
  const fx = Math.cos(p.facing);
  const fy = Math.sin(p.facing);
  p.vx = fx * p.speed;
  p.vy = fy * p.speed;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.role === 'GK' || b.heldBy >= 0) return null;

  if (!p.slideHitBall) {
    const reachX = p.x + fx * PLAYER.RADIUS;
    const reachY = p.y + fy * PLAYER.RADIUS;
    if (
      Math.hypot(b.x - reachX, b.y - reachY) < TACKLE.SLIDE_REACH &&
      b.z < DRIBBLE.CONTROL_MAX_Z
    ) {
      b.vx = fx * TACKLE.SLIDE_BALL_SPEED;
      b.vy = fy * TACKLE.SLIDE_BALL_SPEED;
      b.vz = 0;
      markTouch(b, p, time);
      p.slideHitBall = true;
      return 'ball';
    }
    for (const o of players) {
      if (o.team === p.team || o.action === 'fallen') continue;
      if (Math.hypot(o.x - p.x, o.y - p.y) < PLAYER.RADIUS * 2) {
        setAction(p, 'fallen', TACKLE.FALL_TIME);
        setAction(o, 'fallen', TACKLE.FALL_TIME);
        p.speed = 0;
        o.speed = 0;
        return 'fall';
      }
    }
  }
  return null;
}

/** 행동 타이머 진행: 슬라이딩이 끝나면 회복(stunned), 회복·넘어짐이 끝나면 none */
export function tickAction(p: PlayerState, dt: number): void {
  if (p.action === 'none') return;
  p.actionTime -= dt;
  if (p.actionTime > 0) return;
  if (p.action === 'slide') {
    p.speed = 0;
    setAction(p, 'stunned', p.role === 'GK' ? AI_GK.DIVE_RECOVERY : TACKLE.SLIDE_RECOVERY);
  } else {
    setAction(p, 'none', 0);
  }
}
