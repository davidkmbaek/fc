import { BALL, DEV_LAUNCH, RULES } from '../config';
import { bounceOffWorldEdge, copyBall, createBall, type BallState, stepBall } from './ball';
import type { SimEvent } from './events';
import { collideGoalFrame, collideNets } from './goalFrame';
import { detectCrossing } from './lines';
import { rollSpeedForDistance } from './math/rolling';
import { computePitchGeometry, type PitchGeometry } from './pitch';
import { Rng } from './rng';
import { restartFor, scoringTeam } from './rules';

export interface SimState {
  /** 지금까지 실행한 스텝 수 */
  tick: number;
  /** 시뮬레이션 시간 (초) = tick × dt */
  time: number;
  ball: BallState;
  /** 홈 팀 공격 방향 (전반 +1). 진영 교체는 4.2에서 */
  homeAttackDir: 1 | -1;
  /** 골·아웃 후 공을 다시 놓을 tick (-1 = 경기 진행 중) */
  ballResetTick: number;
}

function createState(): SimState {
  return { tick: 0, time: 0, ball: createBall(), homeAttackDir: 1, ballResetTick: -1 };
}

/** 핫 루프에서 객체를 만들지 않도록 필드를 복사한다 */
function copyState(dst: SimState, src: SimState): void {
  dst.tick = src.tick;
  dst.time = src.time;
  copyBall(dst.ball, src.ball);
  dst.homeAttackDir = src.homeAttackDir;
  dst.ballResetTick = src.ballResetTick;
}

interface LaunchCommand {
  x: number;
  y: number;
  lofted: boolean;
}

/**
 * 시뮬레이션 전체 상태와 한 스텝 진행. Phaser 없이 Node에서 돌아간다.
 * 렌더러는 `prev`와 `curr`를 읽어 보간할 뿐 바꾸지 않는다.
 * 외부 명령(개발 도구 등)은 바로 적용하지 않고 다음 스텝 시작에 적용한다(결정성).
 */
export class Simulation {
  readonly rng: Rng;
  readonly geo: PitchGeometry = computePitchGeometry();
  readonly prev: SimState = createState();
  readonly curr: SimState = createState();
  private launch: LaunchCommand | null = null;
  private readonly events: SimEvent[] = [];

  constructor(
    readonly dt: number,
    seed: number,
  ) {
    this.rng = new Rng(seed);
  }

  /** 개발 도구: 다음 스텝에 공을 (x, y)로 보낸다. lofted면 공중 볼 */
  requestLaunch(x: number, y: number, lofted: boolean): void {
    this.launch = { x, y, lofted };
  }

  /** 지금까지 쌓인 이벤트를 꺼내고 비운다 (렌더 프레임마다 호출) */
  drainEvents(): SimEvent[] {
    return this.events.splice(0, this.events.length);
  }

  step(): void {
    copyState(this.prev, this.curr);
    const s = this.curr;
    s.tick++;
    s.time = s.tick * this.dt;

    if (s.ballResetTick >= 0 && s.tick >= s.ballResetTick) this.resetBall();
    if (this.launch) {
      applyLaunch(s.ball, this.launch);
      this.launch = null;
    }

    this.stepBallWithCollisions();
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

  /** 골·아웃 뒤 공을 센터 스폿에 다시 놓는다 (시나리오·경기 상태 머신 전까지 임시) */
  private resetBall(): void {
    const s = this.curr;
    copyBall(s.ball, createBall());
    s.ballResetTick = -1;
    // 순간이동이므로 보간하지 않도록 prev도 맞춘다
    copyBall(this.prev.ball, s.ball);
    this.events.push({ type: 'ballReset', tick: s.tick });
  }
}

/** 땅볼은 굴러감 해석해로 목표 지점에 ARRIVE_SPEED로 도착하게, 공중 볼은 체공 시간으로 계산 */
function applyLaunch(b: BallState, cmd: LaunchCommand): void {
  const dx = cmd.x - b.x;
  const dy = cmd.y - b.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const ux = dx / d;
  const uy = dy / d;

  if (cmd.lofted) {
    const t = DEV_LAUNCH.LOB_TIME_BASE + d * DEV_LAUNCH.LOB_TIME_PER_M;
    const vh = d / t;
    b.vx = ux * vh;
    b.vy = uy * vh;
    b.vz = (BALL.GRAVITY * t) / 2;
  } else {
    const v0 = rollSpeedForDistance(
      d,
      DEV_LAUNCH.ARRIVE_SPEED,
      BALL.ROLL_DECEL,
      BALL.ROLL_DAMPING,
      DEV_LAUNCH.MAX_GROUND_SPEED,
    );
    b.z = 0;
    b.vz = 0;
    b.vx = ux * v0;
    b.vy = uy * v0;
  }
}
