import type { OutLine } from './lines';

export const TEAM_HOME = 0;
export const TEAM_AWAY = 1;

export type Restart = 'throwIn' | 'cornerKick' | 'goalKick';

export function opponent(team: number): number {
  return team === TEAM_HOME ? TEAM_AWAY : TEAM_HOME;
}

/** 팀이 공격하는 방향(+1 = +x). homeAttackDir은 홈 팀 방향(전반 +1, 후반 -1) */
export function attackDir(team: number, homeAttackDir: 1 | -1): 1 | -1 {
  return team === TEAM_HOME ? homeAttackDir : homeAttackDir === 1 ? -1 : 1;
}

/** x = side × 52.5 쪽 골문에 공이 들어갔을 때 득점한 팀 */
export function scoringTeam(side: 1 | -1, homeAttackDir: 1 | -1): number {
  return attackDir(TEAM_HOME, homeAttackDir) === side ? TEAM_HOME : TEAM_AWAY;
}

/**
 * 공이 나간 라인과 마지막 터치 팀으로 재시작 종류와 재시작하는 팀을 정한다. DESIGN.md §6
 * - 터치라인 → 상대 팀 스로인
 * - 골라인 + 수비팀(그 골문을 지키는 팀)이 마지막 터치 → 공격팀 코너킥
 * - 골라인 + 공격팀이 마지막 터치 → 수비팀 골킥
 * 마지막 터치가 없으면(-1, 개발 도구로 찬 공) 홈 팀이 찬 것으로 본다.
 */
export function restartFor(
  line: OutLine,
  side: 1 | -1,
  lastTouchTeam: number,
  homeAttackDir: 1 | -1,
): { restart: Restart; team: number } {
  const toucher = lastTouchTeam < 0 ? TEAM_HOME : lastTouchTeam;
  if (line === 'touch') return { restart: 'throwIn', team: opponent(toucher) };

  const defending = attackDir(TEAM_HOME, homeAttackDir) === side ? TEAM_AWAY : TEAM_HOME;
  if (toucher === defending) return { restart: 'cornerKick', team: opponent(defending) };
  return { restart: 'goalKick', team: defending };
}
