import { SWITCH } from '../config';
import type { PlayerIntent } from '../sim/intent';
import { switchTarget } from '../sim/selection';
import type { SimState } from '../sim/Simulation';

/**
 * 사람이 조종하는 선수(controlledId) 관리. DESIGN.md §5 "선수 전환"
 * 시뮬레이션 스텝마다 호출하므로 같은 입력이면 같은 결과다(결정적).
 * - beforeStep: Q(intent.switchPlayer) → 방향 입력 쪽 동료 또는 공에 가장 빨리 닿는 동료
 * - afterStep: 우리 팀 패스를 받을 동료로 자동 전환, 다른 동료가 공을 건드리면 그 선수로
 */
export class TeamControl {
  private lastTouchSeen: number;

  constructor(
    public controlledId: number,
    readonly team: number,
    initialLastTouch: number,
  ) {
    this.lastTouchSeen = initialLastTouch;
  }

  /** 수동 전환. 바뀌었으면 이전 선수 id, 아니면 -1 */
  beforeStep(intent: PlayerIntent, s: SimState): number {
    if (!intent.switchPlayer) return -1;
    const b = s.ball;
    const next = switchTarget(s.players, this.controlledId, b.x, b.y, intent.moveX, intent.moveY);
    return this.setControlled(next);
  }

  /** 자동 전환. 바뀌었으면 이전 선수 id, 아니면 -1 */
  afterStep(s: SimState): number {
    const b = s.ball;
    let next = this.controlledId;
    if (b.lastTouchPlayer !== this.lastTouchSeen) {
      this.lastTouchSeen = b.lastTouchPlayer;
      if (this.isTeammate(s, b.lastTouchPlayer)) next = b.lastTouchPlayer;
    }
    // 패스를 받을 동료가 우선 (방금 찬 선수 = 마지막 터치보다)
    if (SWITCH.AUTO_ON_PASS && b.passTarget >= 0 && this.isTeammate(s, b.passTarget)) {
      next = b.passTarget;
    }
    return this.setControlled(next);
  }

  private isTeammate(s: SimState, id: number): boolean {
    return s.players[id]?.team === this.team;
  }

  private setControlled(id: number): number {
    if (id === this.controlledId) return -1;
    const prev = this.controlledId;
    this.controlledId = id;
    return prev;
  }
}
