import { SWITCH } from '../config';
import { timeToReach } from './ai/timeToReach';
import { degToRad } from './math/angle';
import { clamp } from './math/scalar';
import type { PlayerState } from './player';

/**
 * 선수 전환 대상. DESIGN.md §5
 * - 방향 입력(dirX, dirY)이 있으면: 현재 선수에서 그 방향 ±DIR_CONE_DEG 안의 동료 중
 *   방향이 가장 잘 맞는 선수 (점수 = 각도/콘 + 거리/DIR_DIST_NORM)
 * - 없거나 그 방향에 동료가 없으면: 공까지 도달 시간이 가장 짧은 동료 (현재 선수 제외)
 * 골키퍼는 제외한다. 후보가 없으면 currentId.
 */
export function switchTarget(
  players: readonly PlayerState[],
  currentId: number,
  ballX: number,
  ballY: number,
  dirX: number,
  dirY: number,
): number {
  const cur = players[currentId];
  if (!cur) return currentId;
  const candidates = players.filter(
    (p) => p.team === cur.team && p.id !== currentId && p.role !== 'GK',
  );

  const len = Math.hypot(dirX, dirY);
  if (len > 0.5) {
    const cone = degToRad(SWITCH.DIR_CONE_DEG);
    let best = -1;
    let bestScore = Infinity;
    for (const p of candidates) {
      const dx = p.x - cur.x;
      const dy = p.y - cur.y;
      const d = Math.hypot(dx, dy);
      if (d < 1e-6) continue;
      const angle = Math.acos(clamp((dx * dirX + dy * dirY) / (d * len), -1, 1));
      if (angle > cone) continue;
      // 방향이 잘 맞는 쪽을 먼저, 같으면 가까운 쪽 (작을수록 좋음)
      const score = angle / cone + d / SWITCH.DIR_DIST_NORM;
      if (score < bestScore) {
        bestScore = score;
        best = p.id;
      }
    }
    if (best >= 0) return best;
  }

  let best = currentId;
  let bestT = Infinity;
  for (const p of candidates) {
    const t = timeToReach(p, ballX, ballY);
    if (t < bestT) {
      bestT = t;
      best = p.id;
    }
  }
  return best;
}

/** team 선수 중 (x, y)에 가장 가까운 선수 id (-1 = 없음). 골키퍼는 includeGk일 때만 */
export function nearestPlayerId(
  players: readonly PlayerState[],
  team: number,
  x: number,
  y: number,
  includeGk = false,
): number {
  let best = -1;
  let bestD = Infinity;
  for (const p of players) {
    if (p.team !== team || (!includeGk && p.role === 'GK')) continue;
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p.id;
    }
  }
  return best;
}
