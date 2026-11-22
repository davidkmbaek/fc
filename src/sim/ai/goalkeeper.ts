import { AI, AI_GK, PASS } from '../../config';
import type { KickIntent, PlayerIntent } from '../intent';
import type { PitchGeometry } from '../pitch';
import type { PlayerState } from '../player';
import type { Rng } from '../rng';
import type { SimState } from '../Simulation';
import {
  type Intercept,
  interceptPoint,
  passSafety,
  safetyScore,
  typicalPassSpeed,
} from './intercept';
import type { BallSample } from './predict';
import { moveTo, stop } from './steer';

/**
 * 공이 골라인(ownGoalX)을 골문 안쪽으로 지날 예상 지점 (y)와 시각. 지나지 않으면 null.
 * 예상 궤적 샘플 사이를 선형 보간한다.
 */
function shotCrossing(
  samples: readonly BallSample[],
  ownGoalX: number,
  geo: PitchGeometry,
): { y: number; t: number } | null {
  const s = Math.sign(ownGoalX);
  for (let k = 1; k < samples.length; k++) {
    const a = samples[k - 1] as BallSample;
    const c = samples[k] as BallSample;
    if (a.x * s < geo.halfLength && c.x * s >= geo.halfLength) {
      const f = (geo.halfLength - a.x * s) / (c.x * s - a.x * s);
      const y = a.y + (c.y - a.y) * f;
      const z = a.z + (c.z - a.z) * f;
      if (Math.abs(y) > geo.goalHalfWidth + 0.5 || z > AI_GK.MAX_Z) return null;
      return { y, t: a.t + (c.t - a.t) * f };
    }
  }
  return null;
}

/**
 * 골키퍼 AI. DESIGN.md §7 골키퍼
 * - 슛이 골문으로 오면: 예상 지점이 손 닿는 거리 밖이면 다이빙(옆으로), 아니면 그 지점으로 이동
 * - 페널티 에어리어 안의 느린 공은 (누가 마지막으로 찼든) 가로채기 지점으로 나간다
 * - 평소: 공과 골문 중앙을 잇는 선 위, 공이 멀수록 앞으로(MIN_OUT ~ MAX_OUT)
 * 공을 가지거나 패스를 받는 골키퍼는 필드 선수와 같은 판단(matchAi)을 한다.
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

  const speed = Math.hypot(b.vx, b.vy);
  const cross = speed >= AI_GK.DIVE_MIN_BALL_SPEED ? shotCrossing(samples, gx, geo) : null;
  if (cross && cross.t < AI_GK.DIVE_TRIGGER_TIME) {
    const dy = cross.y - p.y;
    if (Math.abs(dy) > AI_GK.REACH * 0.7) {
      i.moveX = 0;
      i.moveY = Math.sign(dy);
      i.tackle = 'slide';
    } else {
      moveTo(i, p, p.x, cross.y, true, true);
    }
    return;
  }

  const inOwnBox =
    Math.abs(b.x - gx) < geo.halfLength - geo.penaltyAreaX &&
    Math.abs(b.y) < geo.penaltyAreaHalfWidth;
  if (inOwnBox && speed < AI_GK.CLAIM_MAX_BALL_SPEED) {
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

/**
 * 공을 든 골키퍼: HOLD_TIME 뒤 가장 안전한 동료에게 던지고(땅볼 패스), 없으면 앞으로 멀리 찬다(로빙).
 */
export function goalkeeperDistribute(
  p: PlayerState,
  s: SimState,
  attackDir: 1 | -1,
  i: PlayerIntent,
  kick: KickIntent,
  rng: Rng,
  maxPassDist: number,
): void {
  stop(i);
  if (s.ball.heldTime < AI_GK.HOLD_TIME) return;
  const opponents = s.players.filter((o) => o.team !== p.team);
  let best: PlayerState | undefined;
  let bestScore = AI.SAFE_PASS_MIN_SAFETY;
  for (const t of s.players) {
    if (t.team !== p.team || t.id === p.id) continue;
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    if (d < PASS.MIN_DIST || d > maxPassDist) continue;
    const sc = safetyScore(passSafety(p.x, p.y, t.x, t.y, typicalPassSpeed(d), opponents));
    if (sc > bestScore) {
      bestScore = sc;
      best = t;
    }
  }
  if (best) {
    kick.type = 'pass';
    kick.power = 0.5;
    kick.aimX = best.x - p.x;
    kick.aimY = best.y - p.y;
  } else {
    kick.type = 'lob';
    kick.power = 0.8;
    kick.aimX = attackDir;
    kick.aimY = (rng.next() - 0.5) * 0.6;
  }
  i.kick = kick;
}
