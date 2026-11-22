import { BALL, DEV_LAUNCH } from '../config';
import { bounceOffWorldEdge, copyBall, createBall, type BallState, stepBall } from './ball';
import { rollSpeedForDistance } from './math/rolling';
import { computePitchGeometry, type PitchGeometry } from './pitch';
import { Rng } from './rng';

export interface SimState {
  /** 지금까지 실행한 스텝 수 */
  tick: number;
  /** 시뮬레이션 시간 (초) = tick × dt */
  time: number;
  ball: BallState;
}

function createState(): SimState {
  return { tick: 0, time: 0, ball: createBall() };
}

/** 핫 루프에서 객체를 만들지 않도록 필드를 복사한다 */
function copyState(dst: SimState, src: SimState): void {
  dst.tick = src.tick;
  dst.time = src.time;
  copyBall(dst.ball, src.ball);
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

  step(): void {
    copyState(this.prev, this.curr);
    const s = this.curr;
    s.tick++;
    s.time = s.tick * this.dt;

    if (this.launch) {
      applyLaunch(s.ball, this.launch);
      this.launch = null;
    }

    stepBall(s.ball, this.dt);
    bounceOffWorldEdge(s.ball, this.geo.worldHalfLength, this.geo.worldHalfWidth);
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
