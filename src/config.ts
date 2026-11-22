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

/** 경기장 규격 (미터). DESIGN.md §2 */
export const PITCH = {
  LENGTH: 105,
  WIDTH: 68,
  GOAL_WIDTH: 7.32,
  GOAL_HEIGHT: 2.44,
  GOAL_DEPTH: 2.0,
  POST_RADIUS: 0.06,
  PENALTY_AREA_DEPTH: 16.5,
  PENALTY_AREA_WIDTH: 40.32,
  GOAL_AREA_DEPTH: 5.5,
  GOAL_AREA_WIDTH: 18.32,
  PENALTY_SPOT_DISTANCE: 11,
  /** 센터 서클과 페널티 아크 반지름 */
  CIRCLE_RADIUS: 9.15,
  CORNER_ARC_RADIUS: 1.0,
  LINE_WIDTH: 0.12,
  /** 경기장 밖 여백 (렌더링·선수 이동 가능 영역) */
  MARGIN: 6,
} as const;

export const RENDER = {
  /** 기준 해상도 (16:9, Scale.FIT) */
  WIDTH: 1280,
  HEIGHT: 720,
  BACKGROUND_COLOR: '#1b4d20',
  /** 1미터당 픽셀 (월드 좌표 = 미터 × 이 값) */
  PX_PER_M: 32,
  /** 높이 z를 화면 위쪽으로 옮기는 비율. DESIGN.md §8 */
  Z_SCREEN_SCALE: 0.7,
  /** 레이어 순서 (클수록 위). DESIGN.md §8 */
  DEPTH: {
    PITCH: 0,
    GOAL_BACK: 10,
    GOAL_FRONT: 30,
  },
} as const;

/** 개발 빌드 전용 임시 카메라 (1.3에서 경기 카메라로 대체) */
export const DEV_CAMERA = {
  /** 휠 한 칸당 확대 배율 */
  WHEEL_ZOOM_FACTOR: 1.15,
  MAX_ZOOM: 2,
} as const;

/** 경기장 그리기 */
export const PITCH_STYLE = {
  GRASS_LIGHT: 0x3f9b3f,
  GRASS_DARK: 0x37893a,
  /** 잔디 줄무늬 폭 (미터). 105 / 7.5 = 14줄 */
  STRIPE_WIDTH: 7.5,
  LINE_COLOR: 0xf2f2f2,
  /** 센터·페널티 스폿 반지름 (미터) */
  SPOT_RADIUS: 0.2,
  POST_COLOR: 0xffffff,
  NET_COLOR: 0xffffff,
  NET_ALPHA: 0.35,
  NET_FLOOR_ALPHA: 0.12,
  /** 골망 격자 간격 (미터) */
  NET_MESH: 0.35,
  NET_LINE_WIDTH_PX: 1,
} as const;
