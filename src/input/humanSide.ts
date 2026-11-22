import { possessorId } from '../sim/dribble';
import type { PlayerIntent } from '../sim/intent';
import type { SimState } from '../sim/Simulation';
import { HumanController } from './humanController';
import type { KeyReader } from './keyboard';
import { TeamControl } from './teamControl';

/** 의도를 "가만히"로 되돌린다 (조종을 넘겨받은 선수가 마지막 입력대로 계속 달리지 않게) */
function clearIntent(i: PlayerIntent | undefined): void {
  if (!i) return;
  i.moveX = 0;
  i.moveY = 0;
  i.sprint = false;
  i.kick = null;
  i.tackle = null;
  i.switchPlayer = false;
}

/**
 * 사람 한 명이 한 팀을 조종: 키 → 조작 선수의 의도, 선수 전환.
 * 시뮬레이션 스텝마다 beforeStep → sim.step → afterStep 순서로 호출한다.
 */
export class HumanSide {
  readonly input: HumanController;
  private readonly control: TeamControl;
  private readonly team: number;

  constructor(keys: KeyReader, dt: number, team: number, startId: number, s: SimState) {
    this.team = team;
    this.input = new HumanController(keys, dt);
    this.control = new TeamControl(startId, team, s.ball.lastTouchPlayer);
  }

  get controlledId(): number {
    return this.control.controlledId;
  }

  beforeStep(intents: PlayerIntent[], s: SimState): void {
    const intent = intents[this.controlledId];
    if (!intent) return;
    const owner = s.players[possessorId(s.players, s.ball)];
    this.input.sample(intent, owner !== undefined && owner.team !== this.team);
    const prev = this.control.beforeStep(intent, s);
    if (prev >= 0) {
      clearIntent(intents[prev]);
      this.input.reset();
    }
  }

  afterStep(intents: PlayerIntent[], s: SimState): void {
    const prev = this.control.afterStep(s);
    if (prev >= 0) clearIntent(intents[prev]);
  }
}
