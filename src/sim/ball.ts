import { BALL } from '../config';

/** 공 상태. 핫 루프에서 복사하기 쉽도록 숫자 필드만 둔다 */
export interface BallState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** 마지막으로 공을 건드린 선수 id (-1 = 없음) */
  lastTouchPlayer: number;
  /** 마지막으로 공을 건드린 팀 (0 = 홈, 1 = 원정, -1 = 없음) */
  lastTouchTeam: number;
  /** 마지막 터치 시각 (시뮬레이션 초) */
  lastTouchTime: number;
  /** 이 공을 받을 동료 id (패스 직후 설정, 누가 건드리면 -1). 선수 자동 전환·AI 받기용 */
  passTarget: number;
}

export function createBall(x = 0, y = 0): BallState {
  return {
    x,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    lastTouchPlayer: -1,
    lastTouchTeam: -1,
    lastTouchTime: 0,
    passTarget: -1,
  };
}

export function copyBall(dst: BallState, src: BallState): void {
  dst.x = src.x;
  dst.y = src.y;
  dst.z = src.z;
  dst.vx = src.vx;
  dst.vy = src.vy;
  dst.vz = src.vz;
  dst.lastTouchPlayer = src.lastTouchPlayer;
  dst.lastTouchTeam = src.lastTouchTeam;
  dst.lastTouchTime = src.lastTouchTime;
  dst.passTarget = src.passTarget;
}

export function isAirborne(b: BallState): boolean {
  return b.z > 0 || b.vz > 0;
}

export function horizontalSpeed(b: BallState): number {
  return Math.hypot(b.vx, b.vy);
}

/**
 * 공 한 스텝 (충돌 제외). DESIGN.md §3 "매 스텝 처리"
 * 1. 공중: 중력 + 공기 저항(|v|² 비례)
 * 2. 착지: 반발·마찰, 작게 튀면 굴러가는 상태로
 * 3. 굴러감: 상수 감속 + 속도 비례 감쇠, 느려지면 정지
 */
export function stepBall(b: BallState, dt: number): void {
  if (isAirborne(b)) {
    b.vz -= BALL.GRAVITY * dt;
    const speed = Math.hypot(b.vx, b.vy, b.vz);
    // a = AIR_DRAG × |v|² (속도 반대 방향) → v *= 1 - AIR_DRAG × |v| × dt
    const k = Math.max(0, 1 - BALL.AIR_DRAG * speed * dt);
    b.vx *= k;
    b.vy *= k;
    b.vz *= k;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;

    if (b.z <= 0 && b.vz < 0) {
      b.z = 0;
      b.vz = -b.vz * BALL.BOUNCE_RESTITUTION;
      b.vx *= BALL.BOUNCE_FRICTION;
      b.vy *= BALL.BOUNCE_FRICTION;
      if (b.vz < BALL.BOUNCE_STOP_VZ) b.vz = 0;
    }
    return;
  }

  const speed = Math.hypot(b.vx, b.vy);
  if (speed === 0) return;
  const next = speed - (BALL.ROLL_DECEL + BALL.ROLL_DAMPING * speed) * dt;
  if (next < BALL.STOP_SPEED) {
    b.vx = 0;
    b.vy = 0;
    return;
  }
  const k = next / speed;
  b.vx *= k;
  b.vy *= k;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
}

/**
 * 월드 가장자리(여백 끝, 광고판)에서 공을 튕긴다. 아웃 판정과는 별개로 공이 월드 밖으로 나가지 않게 한다.
 */
export function bounceOffWorldEdge(b: BallState, halfLength: number, halfWidth: number): void {
  const maxX = halfLength - BALL.RADIUS;
  const maxY = halfWidth - BALL.RADIUS;
  if (b.x > maxX || b.x < -maxX) {
    b.x = Math.sign(b.x) * maxX;
    b.vx = -b.vx * BALL.BOARD_RESTITUTION;
  }
  if (b.y > maxY || b.y < -maxY) {
    b.y = Math.sign(b.y) * maxY;
    b.vy = -b.vy * BALL.BOARD_RESTITUTION;
  }
}
