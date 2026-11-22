import { copyBall, createBall, type BallState } from './ball';
import { createTeam, formationSpot, TEAM_SIZE } from './formation';
import type { PitchGeometry } from './pitch';
import { createPlayer, type PlayerState } from './player';
import { TEAM_AWAY, TEAM_HOME } from './rules';

/** URL `?scenario=`로 바로 시작하는 상황. DESIGN.md §9 (corner·1v1·counter는 상대·AI가 생긴 뒤) */
export const SCENARIO_IDS = ['match', 'team', 'freeplay', 'penalty', 'tackle'] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export function isScenarioId(v: string): v is ScenarioId {
  return (SCENARIO_IDS as readonly string[]).includes(v);
}

export interface Scenario {
  readonly id: ScenarioId;
  /** 사람이 조종하지 않는 선수를 AI가 움직이는가 (연습용 시나리오는 상대가 가만히 서 있음) */
  readonly ai: boolean;
  /** 경기 규칙(상태 머신·세트피스·시계)을 쓰는가. 아니면 골·아웃 뒤 place()로 재배치 */
  readonly match: boolean;
  /** 시작할 때의 선수 목록 (배열 인덱스 = id) */
  createPlayers(geo: PitchGeometry): PlayerState[];
  /** 시작할 때와 골·아웃 뒤: 공(과 필요하면 선수)을 다시 놓는다 */
  place(ball: BallState, players: PlayerState[], geo: PitchGeometry): void;
}

/** 공·선수를 정지 상태로 (x, y, facing)에 놓는다 */
function putPlayer(p: PlayerState | undefined, x: number, y: number, facing: number): void {
  if (!p) return;
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
  p.speed = 0;
  p.facing = facing;
  p.cooldown = 0;
  p.kickBuffer = 0;
  p.action = 'none';
  p.actionTime = 0;
}

/** 자유 연습: 센터 스폿의 공, 공 바로 뒤의 선수. 골·아웃 뒤에는 공만 센터에 */
const FREEPLAY_START_X = -1.5;
const freeplay: Scenario = {
  id: 'freeplay',
  ai: false,
  match: false,
  createPlayers: () => [createPlayer(0, TEAM_HOME, FREEPLAY_START_X, 0, 0)],
  place(ball) {
    copyBall(ball, createBall(0, 0));
  },
};

/** 페널티: +x 쪽 페널티 스폿의 공, 2m 뒤의 키커. 골·아웃 뒤 둘 다 제자리 */
const PENALTY_RUNUP = 2;
const penalty: Scenario = {
  id: 'penalty',
  ai: false,
  match: false,
  createPlayers: (geo) => [createPlayer(0, TEAM_HOME, geo.penaltySpotX - PENALTY_RUNUP, 0, 0)],
  place(ball, players, geo) {
    copyBall(ball, createBall(geo.penaltySpotX, 0));
    putPlayer(players[0], geo.penaltySpotX - PENALTY_RUNUP, 0, 0);
  },
};

/**
 * 5:5 킥오프: 사람 1명 + 우리 팀 AI 4명 vs AI 5명. 홈(id 0~4)은 +x로 공격, 원정(id 5~9)은 -x.
 * 홈 공격수가 공 옆에서 킥오프. 골·아웃 뒤에는 모두 킥오프 자리로.
 */
/** 킥오프하는 선수는 공 바로 뒤 (KICK_RADIUS 안이라 바로 패스할 수 있다) */
const KICKOFF_TAKER_X = -0.7;
const team: Scenario = {
  id: 'team',
  ai: true,
  match: false,
  createPlayers: () => [...createTeam(TEAM_HOME, 1, 0), ...createTeam(TEAM_AWAY, -1, TEAM_SIZE)],
  place(ball, players) {
    copyBall(ball, createBall(0, 0));
    for (const p of players) {
      const dir = p.team === TEAM_HOME ? 1 : -1;
      const spot = formationSpot(p.id % TEAM_SIZE, dir);
      putPlayer(p, spot.x, spot.y, dir === 1 ? 0 : Math.PI);
    }
    const taker = players.find((p) => p.team === TEAM_HOME && p.role === 'FW');
    if (taker) putPlayer(taker, KICKOFF_TAKER_X, 0, 0);
  },
};

/**
 * 태클 연습: 공을 가진 원정 선수(가만히 서 있음, -x를 봄)와 6m 앞의 홈 수비수.
 * 골·아웃 뒤 처음 자리로.
 */
const TACKLE_CARRIER_X = 6;
const tackle: Scenario = {
  id: 'tackle',
  ai: false,
  match: false,
  createPlayers: () => [
    createPlayer(0, TEAM_HOME, 0, 0, 0, 'DF'),
    createPlayer(1, TEAM_AWAY, TACKLE_CARRIER_X, 0, Math.PI, 'FW'),
  ],
  place(ball, players) {
    putPlayer(players[0], 0, 0, 0);
    putPlayer(players[1], TACKLE_CARRIER_X, 0, Math.PI);
    copyBall(ball, createBall(TACKLE_CARRIER_X - 0.6, 0));
    ball.lastTouchPlayer = 1;
    ball.lastTouchTeam = TEAM_AWAY;
  },
};

/** 정식 경기: 5:5, 상대 AI, 경기 규칙(킥오프·세트피스·전후반) */
const match: Scenario = { ...team, id: 'match', match: true };

const SCENARIOS: Record<ScenarioId, Scenario> = { match, team, freeplay, penalty, tackle };

export function getScenario(id: ScenarioId): Scenario {
  return SCENARIOS[id];
}
