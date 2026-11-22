import { copyBall, createBall, type BallState } from './ball';
import type { PitchGeometry } from './pitch';
import { copyPlayer, type PlayerState } from './player';
import type { Restart } from './rules';
import type { Scenario } from './scenarios';

/**
 * 경기 진행 단계. DESIGN.md §6
 * 킥오프는 restartKind = 'kickOff'인 setPiece로 다룬다.
 */
export type MatchPhase =
  'preMatch' | 'setPiece' | 'inPlay' | 'goalScored' | 'outOfPlay' | 'halfTime' | 'fullTime';

export type RestartKind = 'kickOff' | Restart;

/** 경기 상태 (경기 규칙을 쓰는 시나리오만, 숫자·문자열 필드만 두어 복사하기 쉽게) */
export interface MatchState {
  enabled: boolean;
  phase: MatchPhase;
  /** 지금 단계에 들어온 시각 (시뮬레이션 초) */
  phaseStart: number;
  half: 1 | 2;
  /** 이번 반에서 InPlay로 흐른 시간 (초). 화면 시계는 이것을 45분으로 환산 */
  clock: number;
  scoreHome: number;
  scoreAway: number;
  /** 다음(또는 진행 중인) 재시작 */
  restartKind: RestartKind;
  restartTeam: number;
  restartX: number;
  restartY: number;
  takerId: number;
  /** 세트피스 위치 잡기가 끝났는가, 끝난 시각 */
  ready: boolean;
  readyAt: number;
  /** 전반 킥오프를 한 팀 (후반은 상대가 킥오프) */
  firstKickoffTeam: number;
}

export function createMatch(enabled: boolean): MatchState {
  return {
    enabled,
    phase: enabled ? 'preMatch' : 'inPlay',
    phaseStart: 0,
    half: 1,
    clock: 0,
    scoreHome: 0,
    scoreAway: 0,
    restartKind: 'kickOff',
    restartTeam: 0,
    restartX: 0,
    restartY: 0,
    takerId: -1,
    ready: false,
    readyAt: 0,
    firstKickoffTeam: 0,
  };
}

export function copyMatch(dst: MatchState, src: MatchState): void {
  Object.assign(dst, src);
}

export interface SimState {
  /** 지금까지 실행한 스텝 수 */
  tick: number;
  /** 시뮬레이션 시간 (초) = tick × dt */
  time: number;
  ball: BallState;
  /** 선수들. 배열 인덱스 = 선수 id */
  players: PlayerState[];
  /** 홈 팀 공격 방향 (전반 +1, 후반 -1) */
  homeAttackDir: 1 | -1;
  /** (연습 시나리오) 골·아웃 후 공을 다시 놓을 tick (-1 = 진행 중) */
  ballResetTick: number;
  match: MatchState;
}

export function createState(scenario: Scenario, geo: PitchGeometry): SimState {
  const s: SimState = {
    tick: 0,
    time: 0,
    ball: createBall(),
    players: scenario.createPlayers(geo),
    homeAttackDir: 1,
    ballResetTick: -1,
    match: createMatch(scenario.match),
  };
  scenario.place(s.ball, s.players, geo);
  return s;
}

/** 핫 루프에서 객체를 만들지 않도록 필드를 복사한다 */
export function copyState(dst: SimState, src: SimState): void {
  dst.tick = src.tick;
  dst.time = src.time;
  copyBall(dst.ball, src.ball);
  for (let i = 0; i < src.players.length; i++) {
    const d = dst.players[i];
    const p = src.players[i];
    if (d && p) copyPlayer(d, p);
  }
  dst.homeAttackDir = src.homeAttackDir;
  dst.ballResetTick = src.ballResetTick;
  copyMatch(dst.match, src.match);
}

/** 순간이동 뒤 보간하지 않도록 prev의 공·선수 위치를 curr에 맞춘다 */
export function snapPrev(prev: SimState, curr: SimState): void {
  copyBall(prev.ball, curr.ball);
  for (let i = 0; i < curr.players.length; i++) {
    const d = prev.players[i];
    const p = curr.players[i];
    if (d && p) copyPlayer(d, p);
  }
}
