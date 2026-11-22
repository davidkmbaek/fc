import { FORMATION_5 } from '../config';
import { createPlayer, type PlayerState } from './player';

/** 포메이션 i번 자리의 위치. attackDir = 그 팀의 공격 방향 (+1이면 +x 쪽으로 공격) */
export function formationSpot(i: number, attackDir: 1 | -1): { x: number; y: number } {
  const s = FORMATION_5[i];
  if (!s) throw new Error(`formation index ${i} out of range`);
  return { x: s.x * attackDir, y: s.y };
}

/** 한 팀(5명)을 포메이션 자리에 만든다. id는 firstId부터 차례로 */
export function createTeam(team: number, attackDir: 1 | -1, firstId: number): PlayerState[] {
  const facing = attackDir === 1 ? 0 : Math.PI;
  return FORMATION_5.map((s, i) => {
    const spot = formationSpot(i, attackDir);
    return createPlayer(firstId + i, team, spot.x, spot.y, facing, s.role);
  });
}

export const TEAM_SIZE = FORMATION_5.length;
