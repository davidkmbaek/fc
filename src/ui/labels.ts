import type { SimEvent } from '../sim/events';
import type { Restart } from '../sim/rules';
import { TEAM_HOME } from '../sim/rules';

export function teamName(team: number): string {
  return team === TEAM_HOME ? '홈' : '원정';
}

const RESTART_NAMES: Record<Restart, string> = {
  throwIn: '스로인',
  cornerKick: '코너킥',
  goalKick: '골킥',
};

/** 이벤트를 화면 배너 문구로. 배너가 필요 없는 이벤트는 null. small이면 작은 배너 */
export function bannerFor(e: SimEvent): { text: string; small: boolean } | null {
  switch (e.type) {
    case 'goal':
      return { text: `GOAL!  ${teamName(e.team)} 득점`, small: false };
    case 'out':
      return { text: `${RESTART_NAMES[e.restart]} — ${teamName(e.team)}`, small: false };
    case 'frameHit':
      return { text: e.part === 'post' ? '골포스트!' : '크로스바!', small: true };
    default:
      return null;
  }
}
