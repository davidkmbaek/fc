import { MATCH } from '../config';
import type { MatchState } from '../sim/state';

/**
 * 화면 시계 "mm:ss". 실제 반 길이(HALF_SECONDS)를 45분으로 환산하고, 후반은 45:00부터. DESIGN.md §6
 */
export function formatMatchClock(clock: number, half: 1 | 2): string {
  const halfMinutes = MATCH.DISPLAY_HALF_MINUTES;
  const ratio = Math.min(1, Math.max(0, clock / MATCH.HALF_SECONDS));
  const totalSeconds = Math.floor(ratio * halfMinutes * 60) + (half === 2 ? halfMinutes * 60 : 0);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** 점수판 오른쪽에 붙는 상태 문구 */
export function phaseLabel(m: MatchState): string {
  switch (m.phase) {
    case 'preMatch':
      return '경기 전';
    case 'halfTime':
      return '하프타임';
    case 'fullTime':
      return '종료';
    default:
      return m.half === 1 ? '전반' : '후반';
  }
}
