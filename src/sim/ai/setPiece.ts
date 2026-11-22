import { AI, type AiParams, MATCH, PASS } from '../../config';
import type { KickIntent } from '../intent';
import type { PitchGeometry } from '../pitch';
import type { PlayerState } from '../player';
import type { Rng } from '../rng';
import { attackDir } from '../rules';
import type { SimState } from '../state';
import { passSafety, safetyScore, typicalPassSpeed } from './intercept';

/** maxDist 안에서 패스 안전도(+ 전진 조금)가 가장 좋은 동료 (기준 미달이면 undefined) */
function bestSafeTeammate(
  p: PlayerState,
  s: SimState,
  maxDist: number,
  dir: 1 | -1,
): PlayerState | undefined {
  const opponents = s.players.filter((o) => o.team !== p.team);
  let best: PlayerState | undefined;
  let bestValue = -Infinity;
  for (const t of s.players) {
    if (t.team !== p.team || t.id === p.id || t.role === 'GK') continue;
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    if (d < PASS.MIN_DIST || d > maxDist) continue;
    const sc = safetyScore(passSafety(p.x, p.y, t.x, t.y, typicalPassSpeed(d), opponents));
    if (sc < AI.SAFE_PASS_MIN_SAFETY) continue;
    const v = sc + ((t.x - p.x) * dir) / 40;
    if (v > bestValue) {
      bestValue = v;
      best = t;
    }
  }
  return best;
}

/**
 * AI 키커의 세트피스 킥. DESIGN.md §6
 * - 코너킥: 상대 페널티 에어리어 안에서 페널티 스폿에 가장 가까운 동료에게 로빙(크로스), 없으면 스폿으로
 * - 킥오프·스로인·골킥: 안전한 동료에게 패스, 없으면 앞으로 로빙
 */
export function setPieceKick(
  p: PlayerState,
  s: SimState,
  geo: PitchGeometry,
  params: AiParams,
  rng: Rng,
  kick: KickIntent,
): KickIntent {
  const m = s.match;
  const dir = attackDir(p.team, s.homeAttackDir);
  kick.power = 0.5;

  if (m.restartKind === 'cornerKick') {
    const spotX = dir * geo.penaltySpotX;
    let target: PlayerState | undefined;
    let bestD = Infinity;
    for (const t of s.players) {
      if (t.team !== p.team || t.id === p.id) continue;
      const inBox = Math.abs(t.x) > geo.penaltyAreaX && Math.sign(t.x) === dir;
      const d = Math.hypot(t.x - spotX, t.y);
      if (inBox && d < bestD) {
        bestD = d;
        target = t;
      }
    }
    kick.type = 'lob';
    kick.aimX = (target?.x ?? spotX) - p.x;
    kick.aimY = (target?.y ?? 0) - p.y;
    return kick;
  }

  const maxDist =
    m.restartKind === 'throwIn' ? MATCH.THROW_MAX_DIST : Math.max(params.MAX_PASS_DIST, 25);
  const t = bestSafeTeammate(p, s, maxDist, dir);
  if (t) {
    kick.type = 'pass';
    kick.aimX = t.x - p.x;
    kick.aimY = t.y - p.y;
    return kick;
  }
  kick.type = 'lob';
  kick.power = m.restartKind === 'goalKick' ? 0.8 : 0.4;
  kick.aimX = dir;
  kick.aimY = (rng.next() - 0.5) * 0.8;
  return kick;
}
