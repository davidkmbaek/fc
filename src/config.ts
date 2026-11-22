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

/** 선수 물리. DESIGN.md §4 */
export const PLAYER = {
  /** 충돌 반지름 (m) */
  RADIUS: 0.4,
  HEIGHT: 1.8,
  RUN_SPEED: 6.0,
  SPRINT_SPEED: 8.0,
  /** 공을 몰고 갈 때 속도 배율 */
  DRIBBLE_SPEED_FACTOR: 0.9,
  /** m/s² */
  ACCEL: 7,
  DECEL: 10,
  /** 최대 회전 속도: 정지 상태 → 스프린트 최고 속도 사이를 속도에 따라 보간 (°/s) */
  TURN_RATE_SLOW_DEG: 720,
  TURN_RATE_SPRINT_DEG: 270,
  /** 이 크기 미만의 이동 입력은 무시 */
  MOVE_DEADZONE: 0.15,
};

/** 볼 컨트롤과 드리블. DESIGN.md §4 */
export const DRIBBLE = {
  /** 이 거리 안, 이 높이 아래, 이 상대 속도 미만이면 컨트롤 가능 */
  CONTROL_RADIUS: 0.8,
  CONTROL_MAX_Z: 0.6,
  CONTROL_MAX_REL_SPEED: 7,
  /**
   * 드리블 터치는 공이 이 거리(m) 안에 들어왔을 때 한다 (DESIGN.md §4에는 없는 값).
   * CONTROL_RADIUS 경계(0.8)에서 터치하면 공이 약 1.1m까지 앞서 나가 드리블 중 슛이 거의 안 된다.
   * 0.55면 일반 드리블에서 공이 약 0.55 ~ 0.83m 사이에 머문다. 몸 충돌 거리(0.51)보다 커야 한다.
   */
  TOUCH_RADIUS: 0.55,
  /**
   * 킥(슛·패스)은 공이 이 거리(m) 안이면 찰 수 있다 (높이·상대 속도 조건은 컨트롤과 같음).
   * 일반 드리블 최대 간격(약 0.83m)보다 커서 언제든 슛할 수 있다. 스프린트 드리블은 자주 놓친다.
   */
  KICK_RADIUS: 0.9,
  /** 터치: 공 속도 = 선수 속도 + 이 값 (m/s) */
  TOUCH_BOOST: 1.2,
  TOUCH_BOOST_SPRINT: 3.0,
  /** 터치 사이 최소 간격 (초) */
  TOUCH_COOLDOWN: 0.25,
  /** 이 속력 미만이면 터치하지 않는다 (공을 발밑에 둔 채 서 있기) */
  TOUCH_MIN_PLAYER_SPEED: 0.5,
  /** 공이 선수 뒤쪽에 있으면 터치하지 않는다: (공-선수)·보는방향 > 이 값(m)일 때만 */
  TOUCH_MIN_FORWARD: -0.1,
  /** 공이 선수 몸에 부딪힐 때 반발 */
  BODY_RESTITUTION: 0.3,
  /** 킥 직후 다시 터치하지 않는 시간 (초) */
  KICK_COOLDOWN: 0.3,
  /** 공을 컨트롤할 수 없을 때 누른 킥을 들고 있는 시간 (초). DESIGN.md §5 입력 버퍼 */
  KICK_BUFFER: 0.15,
};

/** 슛. DESIGN.md §5 */
export const SHOT = {
  /** 버튼을 이만큼(초) 누르면 최대 파워 */
  CHARGE_TIME: 1.0,
  MIN_SPEED: 12,
  MAX_SPEED: 30,
  /** 수직 속도 = VZ_BASE + power² × VZ_POWER → 세게 찰수록 뜬다 */
  VZ_BASE: 1.5,
  VZ_POWER: 5.5,
  /** 조준 입력 y가 이보다 크면 해당 포스트 쪽을 노린다 (아니면 골문 가운데) */
  AIM_THRESHOLD: 0.3,
  /** 포스트를 노릴 때 포스트 안쪽 여유 (m) */
  POST_MARGIN: 0.6,
  /** 각도 오차(°) = BASE + power² × POWER + 압박 수 × PRESSURE (2단계에서 압박 계산) */
  ERROR_BASE_DEG: 1.5,
  ERROR_POWER_DEG: 5,
  ERROR_PRESSURE_DEG: 3,
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
  PLAYER,
  DRIBBLE,
  SHOT,
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

/** 경기 카메라. DESIGN.md §8 */
export const CAMERA = {
  /** 1.0 = 화면 너비 1280px에 40m (1280 / (40 × 32)) */
  ZOOM: 1.0,
  /** 목표점 = 공 위치 + 공 속도 × 이 시간 (진행 방향을 미리 보여줌) */
  LOOKAHEAD_S: 0.3,
  /** 목표점이 카메라 중심에서 이만큼(m) 벗어나기 전까지는 움직이지 않는다 */
  DEADZONE_X: 3,
  DEADZONE_Y: 2,
  /** 따라가는 빠르기 (1/s). 클수록 빨리 따라감 */
  FOLLOW_RATE: 5,
};

/** 키 배치 (KeyboardEvent.code). DESIGN.md §5 */
export const KEYS = {
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  PASS: 'KeyS',
  LOB: 'KeyA',
  THROUGH: 'KeyW',
  SHOOT: 'KeyD',
  SPRINT: 'KeyE',
  SWITCH: 'KeyQ',
} as const;

/** 선수 그리기 */
export const PLAYER_STYLE = {
  HOME_COLOR: 0xd32f2f,
  AWAY_COLOR: 0x1e5fc0,
  OUTLINE_COLOR: 0x111111,
  OUTLINE_PX: 2,
  /** 보는 방향 표시 (흰 삼각형) 길이 (m) */
  NOSE_LENGTH: 0.35,
  NOSE_COLOR: 0xffffff,
  SHADOW_ALPHA: 0.3,
  /** 그림자 오프셋 (m) */
  SHADOW_OFFSET: 0.15,
  /** 선수끼리 y 정렬: depth = PLAYERS + (y + 월드 반폭) × 이 값 (공 depth보다 작게) */
  Y_SORT_SCALE: 0.01,
  /** 파워 게이지 (m): 선수 머리 위 */
  GAUGE_WIDTH: 1.4,
  GAUGE_HEIGHT: 0.22,
  GAUGE_OFFSET_Y: 1.1,
  GAUGE_BG: 0x000000,
  GAUGE_FILL: 0xffd600,
  GAUGE_FULL: 0xff5722,
} as const;

/** 디버그 오버레이의 월드 표시 (컨트롤 반경, 속도 벡터). DESIGN.md §9 */
export const DEBUG_WORLD = {
  CONTROL_COLOR: 0x00e5ff,
  VELOCITY_COLOR: 0xffeb3b,
  BALL_VELOCITY_COLOR: 0xff4081,
  LINE_PX: 2,
  /** 속도 벡터 길이 = 속도 × 이 시간 (초) */
  VELOCITY_SCALE_S: 0.5,
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
