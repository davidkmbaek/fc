import { BALL, DEV_LAUNCH } from '../config';
import type { BallState } from './ball';
import { rollSpeedForDistance } from './math/rolling';

export interface LaunchCommand {
  x: number;
  y: number;
  lofted: boolean;
}

/**
 * 개발 도구: 공을 (x, y)로 보낸다. DESIGN.md §9
 * 땅볼은 굴러감 해석해로 목표 지점에 ARRIVE_SPEED로 도착하게, 공중 볼은 체공 시간으로 계산한다.
 */
export function applyLaunch(b: BallState, cmd: LaunchCommand): void {
  const dx = cmd.x - b.x;
  const dy = cmd.y - b.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const ux = dx / d;
  const uy = dy / d;

  if (cmd.lofted) {
    const t = DEV_LAUNCH.LOB_TIME_BASE + d * DEV_LAUNCH.LOB_TIME_PER_M;
    const vh = d / t;
    b.vx = ux * vh;
    b.vy = uy * vh;
    b.vz = (BALL.GRAVITY * t) / 2;
  } else {
    const v0 = rollSpeedForDistance(
      d,
      DEV_LAUNCH.ARRIVE_SPEED,
      BALL.ROLL_DECEL,
      BALL.ROLL_DAMPING,
      DEV_LAUNCH.MAX_GROUND_SPEED,
    );
    b.z = 0;
    b.vz = 0;
    b.vx = ux * v0;
    b.vy = uy * v0;
  }
}
