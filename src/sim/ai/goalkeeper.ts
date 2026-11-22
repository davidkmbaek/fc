import { AI_GK } from '../../config';
import type { PlayerIntent } from '../intent';
import type { PitchGeometry } from '../pitch';
import type { PlayerState } from '../player';
import type { SimState } from '../Simulation';
import { type Intercept, interceptPoint } from './intercept';
import type { BallSample } from './predict';
import { moveTo } from './steer';

/**
 * 골키퍼 기본 위치. DESIGN.md §7 골키퍼
 * 공과 골문 중앙을 잇는 선 위, 골라인에서 공이 멀수록 나오고(최대 MAX_OUT) 가까울수록 들어간다(최소 MIN_OUT).
 * 자기 페널티 에어리어 안에서 공이 느리게 굴러다니면 (누가 마지막으로 찼든) 가로채기 지점으로 나간다.
 * 공을 가지거나 패스를 받는 골키퍼는 필드 선수와 같은 판단(matchAi)을 한다.
 * (다이빙·캐치·배급은 3.6에서)
 */
export function goalkeeper(
  p: PlayerState,
  s: SimState,
  attackDir: 1 | -1,
  geo: PitchGeometry,
  i: PlayerIntent,
  ip: Intercept,
  samples: readonly BallSample[],
): void {
  const b = s.ball;
  const gx = -attackDir * geo.halfLength;
  const inOwnBox =
    Math.abs(b.x - gx) < geo.halfLength - geo.penaltyAreaX &&
    Math.abs(b.y) < geo.penaltyAreaHalfWidth;
  if (inOwnBox && Math.hypot(b.vx, b.vy) < AI_GK.CLAIM_MAX_BALL_SPEED) {
    const hit = interceptPoint(p, samples, true, ip);
    moveTo(i, p, hit.x, hit.y, true, true);
    return;
  }
  const dx = b.x - gx;
  const dy = b.y;
  const d = Math.hypot(dx, dy);
  const out = Math.min(AI_GK.MAX_OUT, Math.max(AI_GK.MIN_OUT, d * AI_GK.OUT_PER_M));
  const tx = d > 1e-6 ? gx + (dx / d) * out : gx + attackDir * out;
  const ty = d > 1e-6 ? (dy / d) * out : 0;
  moveTo(i, p, tx, ty, true);
}
