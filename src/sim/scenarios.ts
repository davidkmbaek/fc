import { copyBall, createBall, type BallState } from './ball';
import type { PitchGeometry } from './pitch';
import { createPlayer, type PlayerState } from './player';
import { TEAM_HOME } from './rules';

/** URL `?scenario=`로 바로 시작하는 상황. DESIGN.md §9 (corner·1v1·counter는 상대·AI가 생긴 뒤) */
export const SCENARIO_IDS = ['freeplay', 'penalty'] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export function isScenarioId(v: string): v is ScenarioId {
  return (SCENARIO_IDS as readonly string[]).includes(v);
}

export interface Scenario {
  readonly id: ScenarioId;
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
}

/** 자유 연습: 센터 스폿의 공, 공 바로 뒤의 선수. 골·아웃 뒤에는 공만 센터에 */
const FREEPLAY_START_X = -1.5;
const freeplay: Scenario = {
  id: 'freeplay',
  createPlayers: () => [createPlayer(0, TEAM_HOME, FREEPLAY_START_X, 0, 0)],
  place(ball) {
    copyBall(ball, createBall(0, 0));
  },
};

/** 페널티: +x 쪽 페널티 스폿의 공, 2m 뒤의 키커. 골·아웃 뒤 둘 다 제자리 */
const PENALTY_RUNUP = 2;
const penalty: Scenario = {
  id: 'penalty',
  createPlayers: (geo) => [createPlayer(0, TEAM_HOME, geo.penaltySpotX - PENALTY_RUNUP, 0, 0)],
  place(ball, players, geo) {
    copyBall(ball, createBall(geo.penaltySpotX, 0));
    putPlayer(players[0], geo.penaltySpotX - PENALTY_RUNUP, 0, 0);
  },
};

const SCENARIOS: Record<ScenarioId, Scenario> = { freeplay, penalty };

export function getScenario(id: ScenarioId): Scenario {
  return SCENARIOS[id];
}
