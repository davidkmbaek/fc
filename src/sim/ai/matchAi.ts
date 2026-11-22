import { AI, DRIBBLE, TACKLE } from '../../config';
import { possessorId } from '../dribble';
import type { KickIntent, PlayerIntent } from '../intent';
import { Rng } from '../rng';
import { attackDir } from '../rules';
import type { SimState } from '../Simulation';
import type { PitchGeometry } from '../pitch';
import type { PlayerState } from '../player';
import { goalkeeper } from './goalkeeper';
import { type Intercept, interceptPoint } from './intercept';
import { decideOwner } from './ownerDecision';
import { BallPrediction } from './predict';
import { clearActions, moveTo, stop } from './steer';
import { homeSpot, type TeamMode, teamMode } from './teamState';
import { timeToReach } from './timeToReach';

/** AI 시드를 시뮬레이션 시드와 섞는 상수 (같은 시드라도 시뮬레이션 RNG와 다른 수열) */
const AI_SEED_SALT = 0x9e3779b9;

/** 팀별 판단 결과 (반응 시간을 두고 모드를 바꾼다) */
interface TeamBrain {
  mode: TeamMode;
  pendingMode: TeamMode;
  pendingSince: number;
  chaserId: number;
  presserId: number;
}

/**
 * 경기 AI: 사람이 조종하지 않는 모든 선수의 의도를 만든다. DESIGN.md §7
 * 시뮬레이션 스텝마다 sim.step 전에 update()를 부른다. 판단은 DECISION_INTERVAL마다(선수별로 엇갈림),
 * 이동은 매 스텝. 같은 시드·같은 입력이면 같은 결과(결정적).
 */
export class MatchAi {
  private readonly rng: Rng;
  private readonly pred: BallPrediction;
  private readonly decisionSteps: number;
  private readonly teams: TeamBrain[] = [0, 1].map((): TeamBrain => ({
    mode: 'loose',
    pendingMode: 'loose',
    pendingSince: 0,
    chaserId: -1,
    presserId: -1,
  }));
  private readonly kicks: KickIntent[] = [];
  private readonly dribbleDirs: { angle: number }[] = [];
  private readonly home = { x: 0, y: 0 };
  private readonly ip: Intercept = { x: 0, y: 0, t: 0 };

  constructor(
    dt: number,
    seed: number,
    private readonly geo: PitchGeometry,
  ) {
    this.rng = new Rng((seed ^ AI_SEED_SALT) >>> 0);
    this.pred = new BallPrediction(dt);
    this.decisionSteps = Math.max(1, Math.round(AI.DECISION_INTERVAL / dt));
  }

  /** excludeId: 사람이 조종하는 선수 (-1 = 없음) */
  update(s: SimState, intents: PlayerIntent[], excludeId: number): void {
    const b = s.ball;
    this.pred.update(b);
    for (const team of [0, 1]) this.updateTeam(s, team);
    const owner = possessorId(s.players, b);

    for (const p of s.players) {
      const i = intents[p.id];
      if (!i || p.id === excludeId) continue;
      clearActions(i);
      if (p.action !== 'none') {
        stop(i);
        continue;
      }
      const brain = this.teams[p.team] as TeamBrain;
      const dir = attackDir(p.team, s.homeAttackDir);
      const decide = (s.tick + p.id) % this.decisionSteps === 0;

      if (owner === p.id) this.ownBall(p, s, dir, i, decide);
      else if (b.passTarget === p.id) this.receive(p, i);
      else if (p.role === 'GK') goalkeeper(p, s, dir, this.geo, i, this.ip, this.pred.samples);
      else if (brain.mode === 'loose' && brain.chaserId === p.id) this.chase(p, i);
      else if (brain.mode === 'defend' && brain.presserId === p.id) this.press(p, s, i, decide);
      else {
        homeSpot(p, brain.mode, b, dir, this.geo, this.home);
        moveTo(i, p, this.home.x, this.home.y, true);
      }
    }
  }

  /** 팀 모드(반응 시간 적용)와 공 쫓을 선수·압박할 선수를 정한다 */
  private updateTeam(s: SimState, team: number): void {
    const brain = this.teams[team] as TeamBrain;
    const now = teamMode(s.players, s.ball, team);
    if (now !== brain.pendingMode) {
      brain.pendingMode = now;
      brain.pendingSince = s.time;
    }
    if (brain.mode !== brain.pendingMode && s.time - brain.pendingSince >= AI.REACTION_TIME) {
      brain.mode = brain.pendingMode;
    }
    if (s.tick % this.decisionSteps !== team) return;

    let bestChase = Infinity;
    let bestPress = Infinity;
    brain.chaserId = -1;
    brain.presserId = -1;
    for (const p of s.players) {
      if (p.team !== team || p.role === 'GK') continue;
      const ip = interceptPoint(p, this.pred.samples, true, this.ip);
      if (ip.t < bestChase) {
        bestChase = ip.t;
        brain.chaserId = p.id;
      }
      const t = timeToReach(p, s.ball.x, s.ball.y, true, DRIBBLE.CONTROL_RADIUS);
      if (t < bestPress) {
        bestPress = t;
        brain.presserId = p.id;
      }
    }
  }

  private ownBall(
    p: PlayerState,
    s: SimState,
    dir: 1 | -1,
    i: PlayerIntent,
    decide: boolean,
  ): void {
    // 소유자(1.6m 안)라도 킥 거리 밖이면 먼저 공으로 다가간다 (멈춰서 킥만 반복하지 않게)
    const b = s.ball;
    if (Math.hypot(b.x - p.x, b.y - p.y) > DRIBBLE.KICK_RADIUS * AI.OWNER_APPROACH_FACTOR) {
      moveTo(i, p, b.x, b.y, false);
      return;
    }
    const kick = (this.kicks[p.id] ??= { type: 'pass', power: 0, aimX: 0, aimY: 0 });
    const dd = (this.dribbleDirs[p.id] ??= { angle: p.facing });
    if (decide && decideOwner(p, s.players, s.ball, dir, this.geo, this.rng, i, kick, dd)) {
      stop(i);
      return;
    }
    i.moveX = Math.cos(dd.angle);
    i.moveY = Math.sin(dd.angle);
    i.sprint = false;
  }

  private receive(p: PlayerState, i: PlayerIntent): void {
    const ip = interceptPoint(p, this.pred.samples, false, this.ip);
    moveTo(i, p, ip.x, ip.y, true);
  }

  private chase(p: PlayerState, i: PlayerIntent): void {
    const ip = interceptPoint(p, this.pred.samples, true, this.ip);
    moveTo(i, p, ip.x, ip.y, true, true);
  }

  /** 압박: 공으로 달려가 가까우면 확률로 스탠딩 태클 */
  private press(p: PlayerState, s: SimState, i: PlayerIntent, decide: boolean): void {
    const b = s.ball;
    moveTo(i, p, b.x, b.y, true, true);
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (decide && d < TACKLE.STAND_RANGE * AI.TACKLE_RANGE_FACTOR) {
      if (this.rng.next() < AI.TACKLE_CHANCE) i.tackle = 'stand';
    }
  }
}
