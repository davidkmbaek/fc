import { AI, PASS } from '../../config';
import type { BallState } from '../ball';
import type { PitchGeometry } from '../pitch';
import type { PlayerState } from '../player';
import { passSafety, safetyScore, typicalPassSpeed } from './intercept';
import { shotValue } from './ownerDecision';

/** shotValue에 넘길 임시 공 (위치만 쓴다) */
const probe: BallState = {
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  lastTouchPlayer: -1,
  lastTouchTeam: -1,
  lastTouchTime: 0,
  passTarget: -1,
  heldBy: -1,
  heldTime: 0,
};

/**
 * 지원 위치. DESIGN.md §7 Support
 * 홈 위치(hx, hy) 주변 SUPPORT_RADIUS 안의 격자 점마다
 *   소유자에게서의 패스 안전도 + 그 위치의 슛 가능성 + 소유자와의 이상적 거리 - 홈에서 거리
 * 로 점수를 매겨 가장 좋은 점을 out에 넣는다. 경기장 밖 점은 제외.
 */
export function bestSupportSpot(
  owner: PlayerState,
  hx: number,
  hy: number,
  attackDir: 1 | -1,
  players: readonly PlayerState[],
  geo: PitchGeometry,
  out: { x: number; y: number },
): { x: number; y: number } {
  const opponents = players.filter((o) => o.team !== owner.team);
  const r = AI.SUPPORT_RADIUS;
  const step = AI.SUPPORT_GRID_STEP;
  let best = -Infinity;
  out.x = hx;
  out.y = hy;
  for (let gx = -r; gx <= r; gx += step) {
    for (let gy = -r; gy <= r; gy += step) {
      if (gx * gx + gy * gy > r * r) continue;
      const x = hx + gx;
      const y = hy + gy;
      if (Math.abs(x) > geo.halfLength - 2 || Math.abs(y) > geo.halfWidth - 2) continue;
      const d = Math.hypot(x - owner.x, y - owner.y);
      if (d < PASS.MIN_DIST) continue;
      const safety = safetyScore(
        passSafety(owner.x, owner.y, x, y, typicalPassSpeed(d), opponents),
      );
      probe.x = x;
      probe.y = y;
      const shot = shotValue(probe, attackDir, geo, opponents);
      const dist = 1 - Math.min(1, Math.abs(d - AI.SUPPORT_IDEAL_DIST) / AI.SUPPORT_IDEAL_DIST);
      const home = Math.hypot(gx, gy) / AI.SUPPORT_HOME_NORM;
      const score =
        AI.SUPPORT_W_SAFETY * safety + AI.SUPPORT_W_SHOT * shot + AI.SUPPORT_W_DIST * dist - home;
      if (score > best) {
        best = score;
        out.x = x;
        out.y = y;
      }
    }
  }
  return out;
}
