import { PROBE } from '../config';
import { Rng } from './rng';

/** 보간 확인용 임시 점 (1.1에서 공으로 대체) */
export interface ProbeState {
  angle: number;
  x: number;
  y: number;
}

export interface SimState {
  /** 지금까지 실행한 스텝 수 */
  tick: number;
  /** 시뮬레이션 시간 (초) = tick × dt */
  time: number;
  probe: ProbeState;
}

function createState(): SimState {
  return { tick: 0, time: 0, probe: { angle: 0, x: PROBE.RADIUS, y: 0 } };
}

/** 핫 루프에서 객체를 만들지 않도록 필드를 복사한다 */
function copyState(dst: SimState, src: SimState): void {
  dst.tick = src.tick;
  dst.time = src.time;
  dst.probe.angle = src.probe.angle;
  dst.probe.x = src.probe.x;
  dst.probe.y = src.probe.y;
}

/**
 * 시뮬레이션 전체 상태와 한 스텝 진행. Phaser 없이 Node에서 돌아간다.
 * 렌더러는 `prev`와 `curr`를 읽어 보간할 뿐 바꾸지 않는다.
 */
export class Simulation {
  readonly rng: Rng;
  readonly prev: SimState = createState();
  readonly curr: SimState = createState();

  constructor(
    readonly dt: number,
    seed: number,
  ) {
    this.rng = new Rng(seed);
  }

  step(): void {
    copyState(this.prev, this.curr);
    const s = this.curr;
    s.tick++;
    s.time = s.tick * this.dt;

    const p = s.probe;
    p.angle = (p.angle + PROBE.ANGULAR_SPEED * this.dt) % (Math.PI * 2);
    p.x = Math.cos(p.angle) * PROBE.RADIUS;
    p.y = Math.sin(p.angle) * PROBE.RADIUS;
  }
}
