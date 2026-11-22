import { BALL, DRIBBLE, PLAYER, TRAP } from '../config';
import type { BallState } from './ball';
import type { PlayerIntent } from './intent';
import type { PlayerState } from './player';

/**
 * 공을 컨트롤할 수 있는가. DESIGN.md §4
 * 거리 < radius(기본 CONTROL_RADIUS), 높이 < CONTROL_MAX_Z, 선수 대비 공의 상대 속도 < CONTROL_MAX_REL_SPEED
 */
export function canControl(
  p: PlayerState,
  b: BallState,
  radius: number = DRIBBLE.CONTROL_RADIUS,
): boolean {
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  if (dx * dx + dy * dy >= radius * radius) return false;
  if (b.z >= DRIBBLE.CONTROL_MAX_Z) return false;
  return Math.hypot(b.vx - p.vx, b.vy - p.vy) < DRIBBLE.CONTROL_MAX_REL_SPEED;
}

/** 킥(슛·패스)을 할 수 있는가: 컨트롤 조건과 같되 거리만 KICK_RADIUS */
export function canKick(p: PlayerState, b: BallState): boolean {
  return canControl(p, b, DRIBBLE.KICK_RADIUS);
}

/** 볼 소유자: 마지막으로 터치했고 공이 CONTROL_RADIUS × 2 안에 있는 선수 id (-1 = 없음) */
export function possessorId(players: readonly PlayerState[], b: BallState): number {
  const p = players[b.lastTouchPlayer];
  if (!p) return -1;
  const r = DRIBBLE.CONTROL_RADIUS * 2;
  return (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < r * r ? p.id : -1;
}

export function markTouch(b: BallState, p: PlayerState, time: number): void {
  b.lastTouchPlayer = p.id;
  b.lastTouchTeam = p.team;
  b.lastTouchTime = time;
  b.passTarget = -1;
}

/**
 * 드리블 터치: 공이 TOUCH_RADIUS 안에서 컨트롤 가능하고, 쿨다운이 끝났고, 선수가 움직이는 중이면
 * 보는 방향으로 공을 (선수 속도 + TOUCH_BOOST)로 살짝 찬다. 터치했으면 true.
 */
export function tryTouch(
  p: PlayerState,
  intent: PlayerIntent,
  b: BallState,
  time: number,
): boolean {
  if (p.cooldown > 0 || p.speed < DRIBBLE.TOUCH_MIN_PLAYER_SPEED) return false;
  if (Math.hypot(intent.moveX, intent.moveY) < PLAYER.MOVE_DEADZONE) return false;
  if (!canControl(p, b, DRIBBLE.TOUCH_RADIUS)) return false;
  const fx = Math.cos(p.facing);
  const fy = Math.sin(p.facing);
  if ((b.x - p.x) * fx + (b.y - p.y) * fy < DRIBBLE.TOUCH_MIN_FORWARD) return false;

  const speed = p.speed + (intent.sprint ? DRIBBLE.TOUCH_BOOST_SPRINT : DRIBBLE.TOUCH_BOOST);
  b.vx = fx * speed;
  b.vy = fy * speed;
  b.vz = 0;
  b.z = 0;
  p.cooldown = DRIBBLE.TOUCH_COOLDOWN;
  markTouch(b, p, time);
  return true;
}

/**
 * 공과 선수 몸의 충돌 (원기둥, 키 PLAYER.HEIGHT까지). 겹치면 밀어내고
 * 선수 기준 상대 속도의 법선 성분을 BODY_RESTITUTION으로 반사한다. 부딪혔으면 true.
 */
export function collideBallWithPlayer(b: BallState, p: PlayerState, time: number): boolean {
  if (b.z >= PLAYER.HEIGHT) return false;
  const minD = PLAYER.RADIUS + BALL.RADIUS;
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minD * minD) return false;

  const dist = Math.sqrt(distSq);
  const nx = dist > 1e-9 ? dx / dist : Math.cos(p.facing);
  const ny = dist > 1e-9 ? dy / dist : Math.sin(p.facing);
  b.x = p.x + nx * minD;
  b.y = p.y + ny * minD;

  const vn = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny;
  if (vn >= 0) return false;
  const j = (1 + DRIBBLE.BODY_RESTITUTION) * vn;
  b.vx -= j * nx;
  b.vy -= j * ny;
  markTouch(b, p, time);
  return true;
}

/**
 * 공 받기(트래핑): 다른 선수가 찬 공이 컨트롤 범위 안, 가슴 높이(TRAP.MAX_Z) 아래로 오고
 * 상대 속도가 충분히 느리면 선수 발밑에 멈춰 세운다. 공중 볼은 떨어뜨린다. 받았으면 true.
 */
export function tryTrap(p: PlayerState, b: BallState, time: number): boolean {
  if (b.lastTouchPlayer === p.id || p.cooldown > 0) return false;
  if (b.z >= TRAP.MAX_Z) return false;
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  if (dx * dx + dy * dy >= DRIBBLE.CONTROL_RADIUS * DRIBBLE.CONTROL_RADIUS) return false;
  if (Math.hypot(b.vx - p.vx, b.vy - p.vy, b.vz) >= DRIBBLE.CONTROL_MAX_REL_SPEED) return false;

  b.vx = p.vx + (b.vx - p.vx) * TRAP.KEEP;
  b.vy = p.vy + (b.vy - p.vy) * TRAP.KEEP;
  if (b.vz > 0) b.vz = 0;
  p.cooldown = Math.max(p.cooldown, TRAP.COOLDOWN);
  markTouch(b, p, time);
  return true;
}
