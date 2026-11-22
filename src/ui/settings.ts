import { type Difficulty, HOME_COLOR_OPTIONS, PLAYER_STYLE } from '../config';
import type { ScenarioId } from '../sim/scenarios';
import type { TeamColors } from './teamColors';

/** 타이틀 → 경기 화면으로 넘기는 설정 */
export interface MatchStartData {
  scenario: ScenarioId;
  seed: number;
  difficulty: Difficulty;
  /** HOME_COLOR_OPTIONS 인덱스 */
  homeColor: number;
}

export const DIFFICULTY_ORDER: readonly Difficulty[] = ['easy', 'normal', 'hard'];
export const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

export function teamColorsFor(homeColor: number): TeamColors {
  return {
    home: HOME_COLOR_OPTIONS[homeColor]?.color ?? PLAYER_STYLE.HOME_COLOR,
    away: PLAYER_STYLE.AWAY_COLOR,
    homeGk: PLAYER_STYLE.HOME_GK_COLOR,
    awayGk: PLAYER_STYLE.AWAY_GK_COLOR,
  };
}

/** 조작 안내 문구 (README와 같은 내용) */
export const CONTROLS_HELP: readonly string[] = [
  '이동: 방향키        스프린트: E',
  '짧은 패스: S   (수비 중: 스탠딩 태클)',
  '로빙 패스: A   (수비 중: 슬라이딩 태클)',
  '스루패스: W        슛: D (누른 시간 = 세기)',
  '선수 전환: Q (방향키와 함께 누르면 그 방향)',
  '공이 오는 중 패스 키를 누르면 원터치',
  '일시정지 메뉴: Esc',
];
