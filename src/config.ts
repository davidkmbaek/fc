/**
 * 모든 튜닝 수치는 이 파일에 둔다 (CLAUDE.md 규칙 7).
 * 초기값의 근거는 docs/DESIGN.md를 참고한다.
 */

export const SIM = {
  /** 고정 타임스텝 (초) */
  DT: 1 / 60,
  /** 한 프레임에 처리할 최대 스텝 수 (탭 복귀 시 시간 폭주 방지) */
  MAX_STEPS_PER_FRAME: 5,
} as const;

export const RENDER = {
  /** 기준 해상도 (16:9, Scale.FIT) */
  WIDTH: 1280,
  HEIGHT: 720,
  BACKGROUND_COLOR: '#2e7d32',
} as const;
