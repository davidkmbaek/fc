import { PLAYER_STYLE } from '../config';

/** 화면에 쓰는 팀 색 (렌더링 전용, 시뮬레이션과 무관). 4.4 타이틀에서 고를 수 있다 */
export interface TeamColors {
  home: number;
  away: number;
  homeGk: number;
  awayGk: number;
}

export function defaultTeamColors(): TeamColors {
  return {
    home: PLAYER_STYLE.HOME_COLOR,
    away: PLAYER_STYLE.AWAY_COLOR,
    homeGk: PLAYER_STYLE.HOME_GK_COLOR,
    awayGk: PLAYER_STYLE.AWAY_GK_COLOR,
  };
}
