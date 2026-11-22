import { AI } from '../../config';
import type { PlayerState } from '../player';
import { timeToReach } from './timeToReach';

/**
 * 마크 배정. DESIGN.md §7 Mark
 * 우리 골문(ownGoalX)에 가까운 상대일수록 위협적으로 보고, 위협 순서대로 아직 배정되지 않은 수비수 중
 * 도달 시간이 가장 짧은 선수를 붙인다. 공 가진 상대(압박 담당)와 골키퍼는 제외.
 * out[수비수 id] = 마크할 상대 id (배정 없음 = -1)
 */
export function assignMarks(
  players: readonly PlayerState[],
  team: number,
  ownGoalX: number,
  exclude: readonly number[],
  out: number[],
): void {
  for (const p of players) out[p.id] = -1;
  const threats = players
    .filter((o) => o.team !== team && o.role !== 'GK' && !exclude.includes(o.id))
    .filter((o) => Math.abs(o.x - ownGoalX) < AI.MARK_MAX_GOAL_DIST)
    .sort((a, b) => Math.hypot(a.x - ownGoalX, a.y) - Math.hypot(b.x - ownGoalX, b.y));
  const free = players.filter((p) => p.team === team && p.role !== 'GK' && !exclude.includes(p.id));
  for (const o of threats) {
    let best: PlayerState | undefined;
    let bestT = Infinity;
    for (const d of free) {
      if (out[d.id] !== -1) continue;
      const t = timeToReach(d, o.x, o.y);
      if (t < bestT) {
        bestT = t;
        best = d;
      }
    }
    if (best) out[best.id] = o.id;
  }
}

/** 마크 위치: 상대와 우리 골문 중앙 사이, 상대에게서 MARK_DIST (골문 쪽에 선다) */
export function markSpot(
  o: PlayerState,
  ownGoalX: number,
  out: { x: number; y: number },
): { x: number; y: number } {
  const dx = ownGoalX - o.x;
  const dy = -o.y;
  const d = Math.hypot(dx, dy) || 1;
  out.x = o.x + (dx / d) * AI.MARK_DIST;
  out.y = o.y + (dy / d) * AI.MARK_DIST;
  return out;
}
