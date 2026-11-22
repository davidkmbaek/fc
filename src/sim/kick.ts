import { SHOT } from '../config';
import type { BallState } from './ball';
import type { KickIntent } from './intent';
import { degToRad } from './math/angle';
import type { PitchGeometry } from './pitch';
import type { PlayerState } from './player';
import type { Rng } from './rng';

/** 슛 목표 지점의 y: 조준 입력 y로 위·아래 포스트를 고르고, 중립이면 골문 가운데 */
export function shotTargetY(aimY: number, geo: PitchGeometry): number {
  if (Math.abs(aimY) <= SHOT.AIM_THRESHOLD) return 0;
  return Math.sign(aimY) * (geo.goalHalfWidth - SHOT.POST_MARGIN);
}

/** 부정확도(최대 각도 오차, 라디안) = 기본 + power² × 계수 + 압박 × 계수. DESIGN.md §5 */
export function shotErrorRad(power: number, pressure: number): number {
  return degToRad(
    SHOT.ERROR_BASE_DEG + power * power * SHOT.ERROR_POWER_DEG + pressure * SHOT.ERROR_PRESSURE_DEG,
  );
}

/**
 * 슛: 상대 골문(x = attackDir × 52.5) 안의 목표점으로 찬다. DESIGN.md §5
 * - 수평 속도 MIN_SPEED ~ MAX_SPEED (power에 비례)
 * - 수직 속도 VZ_BASE + power² × VZ_POWER (세게 찰수록 크로스바를 넘길 위험)
 * - 방향에 ±오차를 시드 RNG로 더한다 (삼각 분포: 가운데가 더 잦음)
 */
export function executeShot(
  b: BallState,
  p: PlayerState,
  kick: KickIntent,
  attackDir: 1 | -1,
  geo: PitchGeometry,
  rng: Rng,
  pressure = 0,
): void {
  const power = Math.max(0, Math.min(1, kick.power));
  const tx = attackDir * geo.halfLength;
  const ty = shotTargetY(kick.aimY, geo);
  const err = shotErrorRad(power, pressure) * (rng.next() + rng.next() - 1);
  const angle = Math.atan2(ty - b.y, tx - b.x) + err;
  const speed = SHOT.MIN_SPEED + (SHOT.MAX_SPEED - SHOT.MIN_SPEED) * power;

  b.vx = Math.cos(angle) * speed;
  b.vy = Math.sin(angle) * speed;
  b.vz = SHOT.VZ_BASE + power * power * SHOT.VZ_POWER;
  p.facing = Math.atan2(b.vy, b.vx);
}
