import { PLAYER } from '../config';
import type { KickIntent, PlayerIntent } from './intent';
import { angleDiff, degToRad, rotateToward } from './math/angle';
import { clamp, lerp } from './math/scalar';

/** 포지션. DESIGN.md §7 포메이션 */
export type Role = 'GK' | 'DF' | 'MF' | 'FW';

/**
 * 선수 행동 상태. none 외에는 입력을 받지 않는다. DESIGN.md §4 태클
 * - slide: 슬라이딩 중 (보는 방향으로 미끄러짐)
 * - stunned: 태클 실패·슬라이딩 후 행동 불가
 * - fallen: 넘어짐 (슬라이딩이 사람을 먼저 맞힘)
 */
export type PlayerAction = 'none' | 'slide' | 'stunned' | 'fallen';

export interface PlayerState {
  readonly id: number;
  readonly team: number;
  readonly role: Role;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 바라보는 방향 (라디안, +x = 0, +y(화면 아래) = π/2) */
  facing: number;
  /** 바라보는 방향으로의 속력 (m/s, 0 이상) */
  speed: number;
  /** 다음 드리블 터치까지 남은 시간 (초) */
  cooldown: number;
  /**
   * 입력 버퍼에 남은 킥 (DESIGN.md §5): 공을 컨트롤할 수 없을 때 누른 킥을
   * kickBuffer초 동안 들고 있다가 컨트롤 가능해지면 실행한다. 0이면 없음.
   */
  kick: KickIntent;
  kickBuffer: number;
  action: PlayerAction;
  /** 현재 행동이 끝날 때까지 남은 시간 (초) */
  actionTime: number;
  /** 이번 슬라이딩에서 공을 이미 맞혔는가 */
  slideHitBall: boolean;
}

export function createPlayer(
  id: number,
  team: number,
  x = 0,
  y = 0,
  facing = 0,
  role: Role = 'FW',
): PlayerState {
  return {
    id,
    team,
    role,
    x,
    y,
    vx: 0,
    vy: 0,
    facing,
    speed: 0,
    cooldown: 0,
    kick: { type: 'shot', power: 0, aimX: 0, aimY: 0 },
    kickBuffer: 0,
    action: 'none',
    actionTime: 0,
    slideHitBall: false,
  };
}

export function copyPlayer(dst: PlayerState, src: PlayerState): void {
  dst.x = src.x;
  dst.y = src.y;
  dst.vx = src.vx;
  dst.vy = src.vy;
  dst.facing = src.facing;
  dst.speed = src.speed;
  dst.cooldown = src.cooldown;
  copyKick(dst.kick, src.kick);
  dst.kickBuffer = src.kickBuffer;
  dst.action = src.action;
  dst.actionTime = src.actionTime;
  dst.slideHitBall = src.slideHitBall;
}

export function copyKick(dst: KickIntent, src: KickIntent): void {
  dst.type = src.type;
  dst.power = src.power;
  dst.aimX = src.aimX;
  dst.aimY = src.aimY;
}

/** 현재 속력에서의 최대 회전 속도 (rad/s). 느릴 때 빠르게, 스프린트 속도에서 느리게 돈다 */
export function turnRate(speed: number): number {
  const t = clamp(speed / PLAYER.SPRINT_SPEED, 0, 1);
  return degToRad(lerp(PLAYER.TURN_RATE_SLOW_DEG, PLAYER.TURN_RATE_SPRINT_DEG, t));
}

/**
 * 선수 이동 한 스텝. DESIGN.md §4
 * - 입력 방향으로 회전 속도 제한을 지키며 몸을 돌린다
 * - 목표 속력 = 최고 속도 × 입력 크기 × max(0, cos(보는 방향과 입력의 차이))
 *   → 급격히 방향을 틀면 감속하며 돈다
 * - 가속·감속은 ACCEL·DECEL로 제한, 속도는 항상 보는 방향
 */
export function stepPlayer(
  p: PlayerState,
  intent: PlayerIntent,
  dt: number,
  dribbling: boolean,
): void {
  const mag = Math.min(1, Math.hypot(intent.moveX, intent.moveY));
  let targetSpeed = 0;
  if (mag >= PLAYER.MOVE_DEADZONE) {
    const heading = Math.atan2(intent.moveY, intent.moveX);
    p.facing = rotateToward(p.facing, heading, turnRate(p.speed) * dt);
    const maxSpeed =
      (intent.sprint ? PLAYER.SPRINT_SPEED : PLAYER.RUN_SPEED) *
      (dribbling ? PLAYER.DRIBBLE_SPEED_FACTOR : 1);
    targetSpeed = maxSpeed * mag * Math.max(0, Math.cos(angleDiff(p.facing, heading)));
  }

  if (targetSpeed > p.speed) p.speed = Math.min(targetSpeed, p.speed + PLAYER.ACCEL * dt);
  else p.speed = Math.max(targetSpeed, p.speed - PLAYER.DECEL * dt);

  p.vx = Math.cos(p.facing) * p.speed;
  p.vy = Math.sin(p.facing) * p.speed;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
}

/** 선수가 월드(경기장 + 여백) 밖으로 나가지 않게 한다 */
export function clampPlayerToWorld(p: PlayerState, halfLength: number, halfWidth: number): void {
  const maxX = halfLength - PLAYER.RADIUS;
  const maxY = halfWidth - PLAYER.RADIUS;
  if (Math.abs(p.x) > maxX) {
    p.x = Math.sign(p.x) * maxX;
    p.vx = 0;
  }
  if (Math.abs(p.y) > maxY) {
    p.y = Math.sign(p.y) * maxY;
    p.vy = 0;
  }
}
