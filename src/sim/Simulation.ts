import { BALL, DRIBBLE, RULES } from '../config';
import { bounceOffWorldEdge, copyBall, createBall, type BallState, stepBall } from './ball';
import { collidePlayers } from './collision';
import { applyLaunch, type LaunchCommand } from './devLaunch';
import {
  canKick,
  collideBallWithPlayer,
  markTouch,
  possessorId,
  tryTouch,
  tryTrap,
} from './dribble';
import type { SimEvent } from './events';
import { collideGoalFrame, collideNets } from './goalFrame';
import { createIntent, type PlayerIntent } from './intent';
import { executeShot } from './kick';
import { detectCrossing } from './lines';
import { executePass } from './passing';
import { computePitchGeometry, type PitchGeometry } from './pitch';
import { clampPlayerToWorld, copyKick, copyPlayer, type PlayerState, stepPlayer } from './player';
import { Rng } from './rng';
import { attackDir, restartFor, scoringTeam } from './rules';
import { getScenario, type Scenario, type ScenarioId } from './scenarios';

export interface SimState {
  /** 지금까지 실행한 스텝 수 */
  tick: number;
  /** 시뮬레이션 시간 (초) = tick × dt */
  time: number;
  ball: BallState;
  /** 선수들. 배열 인덱스 = 선수 id */
  players: PlayerState[];
  /** 홈 팀 공격 방향 (전반 +1). 진영 교체는 4.2에서 */
  homeAttackDir: 1 | -1;
  /** 골·아웃 후 공을 다시 놓을 tick (-1 = 경기 진행 중) */
  ballResetTick: number;
}

function createState(scenario: Scenario, geo: PitchGeometry): SimState {
  const s: SimState = {
    tick: 0,
    time: 0,
    ball: createBall(),
    players: scenario.createPlayers(geo),
    homeAttackDir: 1,
    ballResetTick: -1,
  };
  scenario.place(s.ball, s.players, geo);
  return s;
}

/** 핫 루프에서 객체를 만들지 않도록 필드를 복사한다 */
function copyState(dst: SimState, src: SimState): void {
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
}

const IDLE_INTENT: Readonly<PlayerIntent> = createIntent();

/**
 * 시뮬레이션 전체 상태와 한 스텝 진행. Phaser 없이 Node에서 돌아간다.
 * 렌더러는 `prev`와 `curr`를 읽어 보간할 뿐 바꾸지 않는다.
 * 외부 명령(개발 도구 등)은 바로 적용하지 않고 다음 스텝 시작에 적용한다(결정성).
 */
export class Simulation {
  readonly rng: Rng;
  readonly geo: PitchGeometry = computePitchGeometry();
  readonly scenario: Scenario;
  readonly prev: SimState;
  readonly curr: SimState;
  private launch: LaunchCommand | null = null;
  private readonly events: SimEvent[] = [];

  constructor(
    readonly dt: number,
    readonly seed: number,
    scenarioId: ScenarioId = 'freeplay',
  ) {
    this.rng = new Rng(seed);
    this.scenario = getScenario(scenarioId);
    this.prev = createState(this.scenario, this.geo);
    this.curr = createState(this.scenario, this.geo);
  }

  /** 개발 도구: 다음 스텝에 공을 (x, y)로 보낸다. lofted면 공중 볼 */
  requestLaunch(x: number, y: number, lofted: boolean): void {
    this.launch = { x, y, lofted };
  }

  /** 지금까지 쌓인 이벤트를 꺼내고 비운다 (렌더 프레임마다 호출) */
  drainEvents(): SimEvent[] {
    return this.events.splice(0, this.events.length);
  }

  /** intents[i] = 선수 i의 이번 스텝 의도 (없으면 가만히) */
  step(intents: readonly PlayerIntent[] = []): void {
    copyState(this.prev, this.curr);
    const s = this.curr;
    s.tick++;
    s.time = s.tick * this.dt;

    if (s.ballResetTick >= 0 && s.tick >= s.ballResetTick) this.resetBall();
    if (this.launch) {
      applyLaunch(s.ball, this.launch);
      this.launch = null;
    }

    const owner = possessorId(s.players, s.ball);
    for (const p of s.players) {
      stepPlayer(p, intents[p.id] ?? IDLE_INTENT, this.dt, p.id === owner);
      clampPlayerToWorld(p, this.geo.worldHalfLength, this.geo.worldHalfWidth);
      p.cooldown = Math.max(0, p.cooldown - this.dt);
    }
    collidePlayers(s.players, owner);
    for (const p of s.players) this.playerBallContact(p, intents[p.id] ?? IDLE_INTENT);

    this.stepBallWithCollisions();
    bounceOffWorldEdge(s.ball, this.geo.worldHalfLength, this.geo.worldHalfWidth);
  }

  /** 킥 → 드리블 터치 → 몸 충돌 순으로 선수와 공의 접촉을 처리한다 */
  private playerBallContact(p: PlayerState, intent: PlayerIntent): void {
    const s = this.curr;
    const b = s.ball;
    if (intent.kick) {
      copyKick(p.kick, intent.kick);
      p.kickBuffer = DRIBBLE.KICK_BUFFER;
    }
    if (p.kickBuffer > 0) {
      if (canKick(p, b)) {
        const k = p.kick;
        let targetId = -1;
        if (k.type === 'shot') {
          executeShot(b, p, k, attackDir(p.team, s.homeAttackDir), this.geo, this.rng);
        } else {
          targetId = executePass(b, p, k, s.players, this.geo, this.rng);
        }
        markTouch(b, p, s.time);
        b.passTarget = targetId;
        p.cooldown = DRIBBLE.KICK_COOLDOWN;
        p.kickBuffer = 0;
        this.events.push({
          type: 'kick',
          tick: s.tick,
          playerId: p.id,
          kind: k.type,
          power: k.power,
          targetId,
        });
        return;
      }
      p.kickBuffer = Math.max(0, p.kickBuffer - this.dt);
    } else if (!tryTrap(p, b, s.time)) {
      // 킥을 기다리는 동안에는 받거나 터치하지 않는다 (원터치 킥을 위해, 공이 멀어지지 않게)
      tryTouch(p, intent, b, s.time);
    }
    // 방금 찬(터치한) 선수의 몸은 그 공과 부딪히지 않는다: 뒤로 하는 패스가 자기 몸에 맞지 않게
    if (b.lastTouchPlayer === p.id && p.cooldown > 0) return;
    collideBallWithPlayer(b, p, s.time);
  }

  /** 공을 서브스텝으로 나눠 움직이며 골대 충돌과 라인 판정을 한다 */
  private stepBallWithCollisions(): void {
    const s = this.curr;
    const b = s.ball;
    const h = this.dt / BALL.SUBSTEPS;
    for (let i = 0; i < BALL.SUBSTEPS; i++) {
      const px = b.x;
      const py = b.y;
      const pz = b.z;
      stepBall(b, h);
      const hit = collideGoalFrame(b, this.geo);
      if (hit) this.events.push({ type: 'frameHit', tick: s.tick, part: hit });
      collideNets(b, px, py, pz, this.geo);

      if (s.ballResetTick >= 0) continue; // 이미 골·아웃 처리 중
      const c = detectCrossing(px, py, pz, b, this.geo);
      if (!c) continue;
      s.ballResetTick = s.tick + Math.round(RULES.BALL_RESET_DELAY / this.dt);
      if (c.kind === 'goal') {
        const team = scoringTeam(c.side, s.homeAttackDir);
        this.events.push({ type: 'goal', tick: s.tick, side: c.side, team });
      } else {
        const r = restartFor(c.line, c.side, b.lastTouchTeam, s.homeAttackDir);
        this.events.push({ type: 'out', tick: s.tick, ...c, ...r });
      }
    }
  }

  /** 골·아웃 뒤 시나리오대로 공(과 선수)을 다시 놓는다 (경기 상태 머신(4.1) 전까지) */
  private resetBall(): void {
    const s = this.curr;
    this.scenario.place(s.ball, s.players, this.geo);
    s.ballResetTick = -1;
    // 순간이동이므로 보간하지 않도록 prev도 맞춘다
    copyBall(this.prev.ball, s.ball);
    for (let i = 0; i < s.players.length; i++) {
      const d = this.prev.players[i];
      const p = s.players[i];
      if (d && p) copyPlayer(d, p);
    }
    this.events.push({ type: 'ballReset', tick: s.tick });
  }
}
