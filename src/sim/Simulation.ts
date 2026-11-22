import { BALL, MATCH, RULES } from '../config';
import { bounceOffWorldEdge, stepBall } from './ball';
import { collidePlayers } from './collision';
import { IDLE_INTENT, pushTackle, resolveContacts, type StepContext, startTackle } from './contact';
import { applyLaunch, type LaunchCommand } from './devLaunch';
import { possessorId } from './dribble';
import type { SimEvent } from './events';
import { collideGoalFrame, collideNets } from './goalFrame';
import { holdBall } from './goalkeeping';
import { createIntent, type PlayerIntent } from './intent';
import { detectCrossing } from './lines';
import { MatchDirector } from './match';
import { computePitchGeometry, type PitchGeometry } from './pitch';
import { clampPlayerToWorld, stepPlayer } from './player';
import { Rng } from './rng';
import { restartFor, scoringTeam } from './rules';
import { getScenario, type Scenario, type ScenarioId } from './scenarios';
import { copyState, createState, type SimState, snapPrev } from './state';
import { stepSlide, tickAction } from './tackle';

export type { SimState } from './state';

/**
 * 시뮬레이션 전체 상태와 한 스텝 진행. Phaser 없이 Node에서 돌아간다.
 * 렌더러는 `prev`와 `curr`를 읽어 보간할 뿐 바꾸지 않는다.
 * 외부 명령(개발 도구 등)은 바로 적용하지 않고 다음 스텝 시작에 적용한다(결정성).
 * 경기 규칙을 쓰는 시나리오(match)는 MatchDirector가 단계·세트피스·시계를 맡는다.
 */
export class Simulation {
  readonly rng: Rng;
  readonly geo: PitchGeometry = computePitchGeometry();
  readonly scenario: Scenario;
  readonly prev: SimState;
  readonly curr: SimState;
  private readonly director: MatchDirector;
  private readonly effective: PlayerIntent[];
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
    this.director = new MatchDirector(this.geo, dt);
    this.effective = this.curr.players.map(() => createIntent());
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
    const m = s.match;
    s.tick++;
    s.time = s.tick * this.dt;

    if (s.ballResetTick >= 0 && s.tick >= s.ballResetTick) this.resetBall();
    if (this.launch) {
      applyLaunch(s.ball, this.launch);
      this.launch = null;
    }

    let use: readonly PlayerIntent[] = intents;
    if (m.enabled) {
      let teleported = this.director.beginStep(s, this.events);
      teleported = this.director.effectiveIntents(s, intents, this.effective) || teleported;
      if (teleported) snapPrev(this.prev, s);
      use = this.effective;
    }

    const ctx: StepContext = { s, geo: this.geo, rng: this.rng, dt: this.dt, events: this.events };
    if (m.enabled && m.phase === 'setPiece' && m.restartKind === 'throwIn') {
      ctx.passMaxDist = MATCH.THROW_MAX_DIST;
      ctx.noShots = true;
    }

    const owner = possessorId(s.players, s.ball);
    for (const p of s.players) {
      const intent = use[p.id] ?? IDLE_INTENT;
      tickAction(p, this.dt);
      if (p.action === 'none' && intent.tackle) startTackle(ctx, p, intent);
      if (p.action === 'slide') {
        const r = stepSlide(p, s.players, s.ball, this.dt, s.time);
        if (r) pushTackle(ctx, p, 'slide', r === 'ball' ? 'won' : 'fall');
      } else {
        // 행동 불가(stunned·fallen) 중에는 입력을 무시하고 멈춘다
        stepPlayer(p, p.action === 'none' ? intent : IDLE_INTENT, this.dt, p.id === owner);
      }
      clampPlayerToWorld(p, this.geo.worldHalfLength, this.geo.worldHalfWidth);
      p.cooldown = Math.max(0, p.cooldown - this.dt);
    }
    collidePlayers(s.players, owner);

    const before = this.events.length;
    resolveContacts(ctx, use, (p) => !m.enabled || this.director.canTouch(s, p));
    if (m.enabled) this.director.afterContacts(s, this.events.slice(before));

    const holder = s.players[s.ball.heldBy];
    if (m.enabled && this.director.lockBall(s)) {
      // 세트피스: 키커가 차기 전까지 공은 재시작 지점에 있다
    } else if (holder && holder.action === 'none') holdBall(s.ball, holder, this.dt);
    else {
      s.ball.heldBy = -1;
      this.stepBallWithCollisions();
    }
    bounceOffWorldEdge(s.ball, this.geo.worldHalfLength, this.geo.worldHalfWidth);
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

      const c = detectCrossing(px, py, pz, b, this.geo);
      if (!c) continue;
      if (s.match.enabled) {
        this.director.onCrossing(s, c, this.events);
        continue;
      }
      // 연습 시나리오: 판정만 하고 잠시 뒤 시나리오대로 재배치
      if (s.ballResetTick >= 0) continue;
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

  /** (연습 시나리오) 골·아웃 뒤 시나리오대로 공(과 선수)을 다시 놓는다 */
  private resetBall(): void {
    const s = this.curr;
    this.scenario.place(s.ball, s.players, this.geo);
    s.ballResetTick = -1;
    snapPrev(this.prev, s);
    this.events.push({ type: 'ballReset', tick: s.tick });
  }
}
