import { AI, DRIBBLE, PASS } from '../../config';
import type { BallState } from '../ball';
import type { KickIntent, PlayerIntent } from '../intent';
import { degToRad } from '../math/angle';
import type { PitchGeometry } from '../pitch';
import type { PlayerState } from '../player';
import type { Rng } from '../rng';
import { passSafety, safetyScore, typicalPassSpeed } from './intercept';
import { timeToReach } from './timeToReach';

/**
 * 슛 기대값(0 ~ 1): 거리(가까울수록)·각도(정면일수록)·앞을 막는 수비수 수로 계산. DESIGN.md §7 KickDecision
 */
export function shotValue(
  b: BallState,
  attackDir: 1 | -1,
  geo: PitchGeometry,
  opponents: readonly PlayerState[],
): number {
  const gx = attackDir * geo.halfLength;
  const dx = gx - b.x;
  const d = Math.hypot(dx, b.y);
  if (d > AI.SHOT_RANGE || dx * attackDir <= 0) return 0;
  const angleFactor = Math.abs(dx) / d;
  let blockers = 0;
  for (const o of opponents) {
    // 공 → 골문 가운데 선분 근처(1.2m)에 있고 공과 골 사이에 있는 선수
    const t = ((o.x - b.x) * dx + (o.y - b.y) * -b.y) / (d * d);
    if (t <= 0 || t >= 1) continue;
    const cx = b.x + dx * t;
    const cy = b.y - b.y * t;
    if (Math.hypot(o.x - cx, o.y - cy) < 1.2) blockers++;
  }
  return (
    (1 - d / AI.SHOT_RANGE) * angleFactor * Math.max(0, 1 - blockers * AI.SHOT_BLOCKER_PENALTY)
  );
}

/** 킥 방향에 난이도 노이즈를 더한 조준 벡터 */
function noisyAim(dx: number, dy: number, rng: Rng, out: KickIntent): void {
  const a = Math.atan2(dy, dx) + degToRad(AI.KICK_NOISE_DEG) * (rng.next() * 2 - 1);
  out.aimX = Math.cos(a);
  out.aimY = Math.sin(a);
}

/**
 * 공 가진 AI 선수의 판단. DESIGN.md §7 KickDecision: 슛 → 전진 패스 → (압박 시) 안전한 패스 → 드리블
 * 킥을 하면 intent.kick에 kick 객체를 넣고 true. 드리블이면 dribbleDir에 방향(라디안)을 넣고 false.
 */
export function decideOwner(
  p: PlayerState,
  players: readonly PlayerState[],
  b: BallState,
  attackDir: 1 | -1,
  geo: PitchGeometry,
  rng: Rng,
  intent: PlayerIntent,
  kick: KickIntent,
  dribbleDir: { angle: number },
): boolean {
  const opponents = players.filter((o) => o.team !== p.team);

  // 1. 슛
  if (shotValue(b, attackDir, geo, opponents) > AI.SHOT_THRESHOLD) {
    const d = Math.hypot(attackDir * geo.halfLength - b.x, b.y);
    kick.type = 'shot';
    kick.power = Math.min(0.95, 0.45 + (d / AI.SHOT_RANGE) * 0.5);
    kick.aimX = attackDir;
    // 먼 포스트를 노린다 (가운데 근처면 무작위)
    kick.aimY = Math.abs(b.y) > 1 ? -Math.sign(b.y) : rng.next() < 0.5 ? -1 : 1;
    intent.kick = kick;
    return true;
  }

  // 2·3. 패스
  let pressure = false;
  for (const o of opponents) {
    if (timeToReach(o, b.x, b.y, true, DRIBBLE.CONTROL_RADIUS) < AI.PRESSURE_TIME) pressure = true;
  }
  let bestForward: PlayerState | undefined;
  let bestForwardValue = -Infinity;
  let bestSafe: PlayerState | undefined;
  let bestSafeValue = -Infinity;
  for (const t of players) {
    if (t.team !== p.team || t.id === p.id || t.action !== 'none') continue;
    if (t.role === 'GK' && !pressure) continue;
    const d = Math.hypot(t.x - b.x, t.y - b.y);
    if (d < PASS.MIN_DIST || d > AI.MAX_PASS_DIST) continue;
    const sc = safetyScore(passSafety(b.x, b.y, t.x, t.y, typicalPassSpeed(d), opponents));
    const gain = (t.x - b.x) * attackDir;
    if (gain > AI.FORWARD_MIN_GAIN && sc > AI.FORWARD_MIN_SAFETY) {
      const v = gain / 20 + sc;
      if (v > bestForwardValue) {
        bestForwardValue = v;
        bestForward = t;
      }
    }
    if (sc > AI.SAFE_PASS_MIN_SAFETY) {
      const v = sc + gain / 40;
      if (v > bestSafeValue) {
        bestSafeValue = v;
        bestSafe = t;
      }
    }
  }
  const target = bestForward ?? (pressure ? bestSafe : undefined);
  if (target) {
    kick.type = 'pass';
    kick.power = 0.5;
    noisyAim(target.x - b.x, target.y - b.y, rng, kick);
    intent.kick = kick;
    return true;
  }

  // 4. 드리블: 골 방향 ± SPREAD 안에서 앞쪽 상대가 가장 먼 방향
  const goalAngle = Math.atan2(-b.y * 0.3, attackDir * geo.halfLength - b.x);
  const spread = degToRad(AI.DRIBBLE_SPREAD_DEG);
  const step = degToRad(AI.DRIBBLE_STEP_DEG);
  let best = goalAngle;
  let bestScore = -Infinity;
  for (let a = goalAngle - spread; a <= goalAngle + spread + 1e-9; a += step) {
    const lx = p.x + Math.cos(a) * AI.DRIBBLE_LOOKAHEAD;
    const ly = p.y + Math.sin(a) * AI.DRIBBLE_LOOKAHEAD;
    let clearance = 8;
    for (const o of opponents) clearance = Math.min(clearance, Math.hypot(o.x - lx, o.y - ly));
    let score = clearance + Math.cos(a - goalAngle) * 3;
    if (Math.abs(lx) > geo.halfLength - 1 || Math.abs(ly) > geo.halfWidth - 1) score -= 10;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  dribbleDir.angle = best;
  return false;
}
