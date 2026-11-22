/**
 * 모든 튜닝 수치는 이 파일에 둔다 (CLAUDE.md 규칙 7).
 * 초기값의 근거는 docs/DESIGN.md를 참고한다.
 *
 * - `as const` 섹션: 바뀌면 안 되는 값 (규격, 해상도 등)
 * - `TUNABLES`에 등록된 섹션: 개발 빌드의 Tweakpane에서 실행 중에 바꿀 수 있다.
 *   `as const`를 붙이지 않아 타입이 number로 유지된다.
 */

export const SIM = {
  /** 고정 타임스텝 (초) */
  DT: 1 / 60,
  /** 한 프레임에 처리할 최대 스텝 수 (탭 복귀 시 시간 폭주 방지) */
  MAX_STEPS_PER_FRAME: 5,
  /** 기본 RNG 시드 (URL `?seed=`로 바꿀 수 있음) */
  DEFAULT_SEED: 1,
} as const;

/** 공 물리. DESIGN.md §3 */
export const BALL = {
  RADIUS: 0.11,
  /** m/s² */
  GRAVITY: 9.81,
  /** 공기 저항 계수: 감속 = AIR_DRAG × |v|² */
  AIR_DRAG: 0.013,
  /** 바운드 반발 계수 (잔디) */
  BOUNCE_RESTITUTION: 0.55,
  /** 바운드할 때 수평 속도 유지 비율 */
  BOUNCE_FRICTION: 0.85,
  /** 바운드 후 vz가 이보다 작으면 굴러가는 상태로 */
  BOUNCE_STOP_VZ: 0.6,
  /** 굴러갈 때 감속: |v| -= (ROLL_DECEL + ROLL_DAMPING × |v|) × dt */
  ROLL_DECEL: 2.0,
  ROLL_DAMPING: 0.25,
  STOP_SPEED: 0.05,
  /** 월드 가장자리(광고판) 반발 계수 */
  BOARD_RESTITUTION: 0.3,
  /**
   * 한 스텝을 나눠 계산하는 횟수. 30 m/s 공이 한 스텝에 0.5m 움직여
   * 골포스트(충돌 반경 0.17m)를 뚫지 않도록 한다.
   */
  SUBSTEPS: 4,
};

/** 골대 충돌. DESIGN.md §3 */
export const GOAL_PHYSICS = {
  POST_RESTITUTION: 0.7,
  /** 골망 안쪽에 부딪힐 때: 수직 성분 반발, 나머지 성분 유지 비율 (속도를 크게 줄임) */
  NET_RESTITUTION: 0.1,
  NET_FRICTION: 0.5,
  /** 골망 바깥쪽(옆·뒤·지붕)에 부딪힐 때 반발 */
  NET_OUTSIDE_RESTITUTION: 0.2,
};

/** 경기 규칙 */
export const RULES = {
  /** 골·아웃 후 공을 다시 놓을 때까지 (초). 경기 상태 머신(4.1) 전까지 임시 */
  BALL_RESET_DELAY: 2,
} as const;

/** 개발 도구: 클릭으로 공 발사. DESIGN.md §9 */
export const DEV_LAUNCH = {
  /** 땅볼 최대 속도 (m/s) */
  MAX_GROUND_SPEED: 30,
  /** 땅볼이 클릭 지점에 도착할 때 속도 (0 = 거기서 멈춤) */
  ARRIVE_SPEED: 0,
  /** 공중 볼 체공 시간 = BASE + 거리 × PER_M (초) */
  LOB_TIME_BASE: 0.6,
  LOB_TIME_PER_M: 0.03,
};

/** Tweakpane에서 조절할 섹션 (이름 → 객체). 값은 number만 */
export const TUNABLES: Record<string, Record<string, number>> = {
  BALL,
  GOAL_PHYSICS,
  DEV_LAUNCH,
};

export const DEBUG = {
  /** `[` `]`로 바꾸는 배속 단계 */
  TIME_SCALES: [0.25, 0.5, 1],
  /** 오버레이 텍스트 갱신 주기 (초) */
  OVERLAY_REFRESH: 0.25,
  /** 스텝 처리 시간 지수이동평균 계수 */
  STEP_TIME_SMOOTHING: 0.1,
  OVERLAY_FONT_SIZE: '14px',
  OVERLAY_COLOR: '#e6ffe6',
  OVERLAY_BACKGROUND: '#000000aa',
  OVERLAY_PADDING: 8,
  /** Tweakpane 패널이 화면 값을 다시 읽는 주기 (밀리초) */
  PANEL_REFRESH_MS: 250,
  /** 이 거리(px) 이하로 움직이고 뗀 포인터만 클릭으로 본다 (드래그와 구분) */
  CLICK_MAX_MOVE_PX: 5,
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
    SHADOWS: 15,
    PLAYERS: 20,
    BALL: 25,
    GOAL_FRONT: 30,
    DEBUG_WORLD: 40,
  },
} as const;

/** 공 그리기. DESIGN.md §8 */
export const BALL_STYLE = {
  /** 화면에서 공을 실제보다 크게 그리는 배율 (시뮬레이션 반지름은 그대로) */
  VISUAL_SCALE: 1.6,
  /** 높이 1m당 크기 증가: 배율 = 1 + z × 이 값 */
  Z_SIZE_GAIN: 0.08,
  COLOR: 0xffffff,
  OUTLINE_COLOR: 0x222222,
  OUTLINE_PX: 1.5,
  SHADOW_COLOR: 0x000000,
  SHADOW_ALPHA: 0.35,
  /** 그림자: 알파와 크기를 1 / (1 + z × 이 값)으로 줄인다 */
  SHADOW_FADE_PER_M: 0.35,
  SHADOW_SHRINK_PER_M: 0.12,
} as const;

/** HUD (점수판·안내 문구) */
export const HUD_STYLE = {
  BANNER_Y: 110,
  BANNER_FONT_SIZE: '40px',
  BANNER_SMALL_FONT_SIZE: '24px',
  BANNER_COLOR: '#ffffff',
  BANNER_STROKE: '#000000',
  BANNER_STROKE_PX: 6,
  /** 배너 표시 시간 (초) */
  BANNER_SECONDS: 1.8,
  BANNER_SMALL_SECONDS: 0.8,
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
