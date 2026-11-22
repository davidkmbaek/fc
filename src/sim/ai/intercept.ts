import { AI, BALL, DRIBBLE, PASS } from '../../config';
import type { PlayerState } from '../player';
import { rollDistance, rollTime } from '../math/rolling';
import type { BallSample } from './predict';
import { timeToReach } from './timeToReach';

export interface Intercept {
  x: number;
  y: number;
  /** 공이 그 지점에 오는 시각 (초, 지금부터) */
  t: number;
}

/**
 * 공 가로채기 지점. DESIGN.md §7
 * 예상 궤적을 시간 순으로 보며, 선수가 공보다 먼저(또는 같이) 도착할 수 있고 공이 발·가슴 높이인 첫 지점.
 * 없으면 궤적의 마지막 점(공이 멈추는 곳)을 돌려준다. out은 재사용할 객체.
 */
export function interceptPoint(
  p: PlayerState,
  samples: readonly BallSample[],
  sprint: boolean,
  out: Intercept,
): Intercept {
  for (const s of samples) {
    if (s.z > AI.INTERCEPT_MAX_Z) continue;
    if (timeToReach(p, s.x, s.y, sprint, DRIBBLE.CONTROL_RADIUS * 0.8) <= s.t) {
      out.x = s.x;
      out.y = s.y;
      out.t = s.t;
      return out;
    }
  }
  const last = samples[samples.length - 1];
  out.x = last?.x ?? p.x;
  out.y = last?.y ?? p.y;
  out.t = last?.t ?? 0;
  return out;
}

/** 땅볼이 v0로 출발해 거리 s에 닿는 시간 (닿지 못하면 Infinity) */
export function rollArrivalTime(v0: number, s: number): number {
  const a = BALL.ROLL_DECEL;
  const b = BALL.ROLL_DAMPING;
  if (s <= 0) return 0;
  if (rollDistance(v0, 0, a, b) <= s) return Infinity;
  // 거리에 대해 단조 증가하는 속도 v1을 이분법으로 찾는다: rollDistance(v0, v1) = s
  let lo = 0;
  let hi = v0;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (rollDistance(v0, mid, a, b) > s) lo = mid;
    else hi = mid;
  }
  return rollTime(v0, (lo + hi) / 2, a, b);
}

/**
 * 패스 안전도. DESIGN.md §7
 * 땅볼 경로 위 점들(PASS_SAFETY_STEP 간격)마다 상대가 그 점에 닿는 시간과 공이 닿는 시간을 비교해,
 * (상대 도달 - 공 도달)의 최솟값(초)을 돌려준다. 음수면 상대가 먼저 닿는다(위험).
 * 받는 사람 바로 앞(마지막 RECEIVER_ZONE m)은 받는 사람이 처리하므로 보지 않는다.
 */
export function passSafety(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  v0: number,
  opponents: readonly PlayerState[],
): number {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return Infinity;
  let minMargin = Infinity;
  const end = Math.max(0, len - AI.PASS_RECEIVER_ZONE);
  for (let s = AI.PASS_SAFETY_STEP; s <= end; s += AI.PASS_SAFETY_STEP) {
    const tBall = rollArrivalTime(v0, s);
    if (!Number.isFinite(tBall)) break;
    const px = fromX + (dx / len) * s;
    const py = fromY + (dy / len) * s;
    for (const o of opponents) {
      const margin = timeToReach(o, px, py, true, DRIBBLE.CONTROL_RADIUS) - tBall;
      if (margin < minMargin) minMargin = margin;
    }
  }
  return minMargin;
}

/**
 * 패스 안전도(초)를 -1 ~ 1 점수로: 여유가 +PASS_SAFE_MARGIN 이상이면 1,
 * 상대가 PASS_SAFE_MARGIN 이상 먼저 닿으면 -1 (확실히 끊기는 패스는 후보에서 사실상 빠진다)
 */
export function safetyScore(margin: number): number {
  if (!Number.isFinite(margin)) return 1;
  return Math.max(-1, Math.min(1, margin / AI.PASS_SAFE_MARGIN));
}

/** 패스 안전도 계산에 쓰는 대표 초기 속도: 받는 사람에게 중간 세기로 도착하는 속도 */
export function typicalPassSpeed(dist: number): number {
  const arrive = (PASS.ARRIVE_SPEED_MIN + PASS.ARRIVE_SPEED_MAX) / 2;
  let lo = arrive;
  let hi = PASS.MAX_SPEED;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (rollDistance(mid, arrive, BALL.ROLL_DECEL, BALL.ROLL_DAMPING) < dist) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
