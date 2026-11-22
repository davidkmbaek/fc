import { BALL, PASS, PLAYER } from '../config';
import type { BallState } from './ball';
import type { KickIntent, KickType } from './intent';
import { degToRad } from './math/angle';
import { rollSpeedForDistance, rollTime } from './math/rolling';
import { clamp } from './math/scalar';
import type { PitchGeometry } from './pitch';
import type { PlayerState } from './player';
import type { Rng } from './rng';

/** 조준 방향 단위 벡터: 입력이 있으면 입력 방향, 없으면 선수가 보는 방향 */
export function aimDirection(p: PlayerState, kick: KickIntent): { x: number; y: number } {
  const len = Math.hypot(kick.aimX, kick.aimY);
  if (len > 1e-6) return { x: kick.aimX / len, y: kick.aimY / len };
  return { x: Math.cos(p.facing), y: Math.sin(p.facing) };
}

/**
 * 간이 패스 안전도 (0 ~ 1): 패스 경로(선분) 위에서 가장 가까운 상대까지의 거리 / LANE_SAFE_DIST.
 * 3.1에서 도달 시간 비교(DESIGN.md §7 passSafety)로 바꾼다.
 */
export function laneSafety(
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  opponents: readonly PlayerState[],
): number {
  const dx = tx - fx;
  const dy = ty - fy;
  const lenSq = dx * dx + dy * dy;
  let minD = Infinity;
  for (const o of opponents) {
    const t = lenSq > 0 ? clamp(((o.x - fx) * dx + (o.y - fy) * dy) / lenSq, 0, 1) : 0;
    const d = Math.hypot(o.x - (fx + dx * t), o.y - (fy + dy * t));
    if (d < minD) minD = d;
  }
  return clamp(minD / PASS.LANE_SAFE_DIST, 0, 1);
}

/**
 * 패스 대상 선택. DESIGN.md §5
 * 조준 방향 ±AIM_CONE_DEG 안의 동료를 각도·거리·안전도로 점수 매겨 가장 좋은 선수 id (-1 = 후보 없음)
 */
export function selectPassTarget(
  passer: PlayerState,
  aimX: number,
  aimY: number,
  type: KickType,
  players: readonly PlayerState[],
): number {
  const cone = degToRad(PASS.AIM_CONE_DEG);
  const maxDist = type === 'lob' ? PASS.MAX_DIST_LOB : PASS.MAX_DIST_GROUND;
  const opponents = players.filter((o) => o.team !== passer.team);
  let best = -1;
  let bestScore = -Infinity;
  for (const p of players) {
    if (p.team !== passer.team || p.id === passer.id) continue;
    const dx = p.x - passer.x;
    const dy = p.y - passer.y;
    const d = Math.hypot(dx, dy);
    if (d < PASS.MIN_DIST || d > maxDist) continue;
    const angle = Math.acos(clamp((dx * aimX + dy * aimY) / d, -1, 1));
    if (angle > cone) continue;
    const angleScore = 1 - angle / cone;
    const distScore = 1 - Math.min(1, Math.abs(d - PASS.IDEAL_DIST) / PASS.IDEAL_DIST);
    // 로빙은 상대 머리 위로 넘어가므로 경로 안전도를 보지 않는다
    const safety = type === 'lob' ? 1 : laneSafety(passer.x, passer.y, p.x, p.y, opponents);
    const score = PASS.W_ANGLE * angleScore + PASS.W_DIST * distScore + PASS.W_SAFETY * safety;
    if (score > bestScore) {
      bestScore = score;
      best = p.id;
    }
  }
  return best;
}

/** power(0 ~ 1) → 받는 사람에게 도착할 속도 ARRIVE_SPEED_MIN ~ MAX */
export function arriveSpeed(power: number): number {
  return (
    PASS.ARRIVE_SPEED_MIN + (PASS.ARRIVE_SPEED_MAX - PASS.ARRIVE_SPEED_MIN) * clamp(power, 0, 1)
  );
}

/**
 * 패스 실행 (짧은 패스·스루패스·로빙). 받을 동료 id를 돌려준다(-1 = 공간으로).
 * - 짧은 패스: 받는 사람에게 arriveSpeed(power)로 도착하는 속도(굴러감 해석해)
 * - 스루패스: 받는 사람 앞 공간(조준 방향 × 달리기 속도 × 도착 시간)으로
 * - 로빙: 체공 시간으로 vz와 수평 속도를 계산
 */
export function executePass(
  b: BallState,
  passer: PlayerState,
  kick: KickIntent,
  players: readonly PlayerState[],
  geo: PitchGeometry,
  rng: Rng,
): number {
  const aim = aimDirection(passer, kick);
  const targetId = selectPassTarget(passer, aim.x, aim.y, kick.type, players);
  const target = players[targetId];

  let tx: number;
  let ty: number;
  if (target) {
    tx = target.x;
    ty = target.y;
  } else {
    const d =
      PASS.NO_TARGET_DIST_MIN +
      (PASS.NO_TARGET_DIST_MAX - PASS.NO_TARGET_DIST_MIN) * clamp(kick.power, 0, 1);
    tx = b.x + aim.x * d;
    ty = b.y + aim.y * d;
  }

  let arrive = arriveSpeed(kick.power);
  if (kick.type === 'through' && target) {
    const d0 = Math.hypot(tx - b.x, ty - b.y);
    const v0 = rollSpeedForDistance(d0, arrive, BALL.ROLL_DECEL, BALL.ROLL_DAMPING, PASS.MAX_SPEED);
    const t = rollTime(v0, arrive, BALL.ROLL_DECEL, BALL.ROLL_DAMPING);
    const lead = Math.min(PASS.THROUGH_LEAD_MAX, PLAYER.RUN_SPEED * t * PASS.THROUGH_LEAD_FACTOR);
    tx = clamp(tx + aim.x * lead, -geo.halfLength, geo.halfLength);
    ty = clamp(ty + aim.y * lead, -geo.halfWidth, geo.halfWidth);
    arrive = PASS.THROUGH_ARRIVE_SPEED;
  }

  const dist = Math.hypot(tx - b.x, ty - b.y);
  const err = degToRad(PASS.ERROR_DEG) * (rng.next() + rng.next() - 1);
  const angle = Math.atan2(ty - b.y, tx - b.x) + err;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);

  if (kick.type === 'lob') {
    const t =
      (PASS.LOB_TIME_BASE + dist * PASS.LOB_TIME_PER_M) * (0.85 + 0.3 * clamp(kick.power, 0, 1));
    const vh = (dist / t) * PASS.LOB_DRAG_COMP;
    b.vx = ux * vh;
    b.vy = uy * vh;
    b.vz = (BALL.GRAVITY * t) / 2;
  } else {
    const v0 = rollSpeedForDistance(
      dist,
      arrive,
      BALL.ROLL_DECEL,
      BALL.ROLL_DAMPING,
      PASS.MAX_SPEED,
    );
    const speed = clamp(v0, PASS.MIN_SPEED, PASS.MAX_SPEED);
    b.vx = ux * speed;
    b.vy = uy * speed;
    b.vz = 0;
    b.z = 0;
  }
  passer.facing = angle;
  return target ? targetId : -1;
}
