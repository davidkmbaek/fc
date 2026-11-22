import type { PlayerState } from './player';

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
