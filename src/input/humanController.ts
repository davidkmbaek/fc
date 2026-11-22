import { KEYS, SHOT } from '../config';
import type { KickIntent, PlayerIntent } from '../sim/intent';
import type { KeyReader } from './keyboard';

/**
 * 키 상태 → PlayerIntent. 시뮬레이션 스텝마다 한 번 호출한다(누른 시간을 스텝 수로 세므로 결정적).
 * DESIGN.md §5
 * - 킥 세기: 버튼을 누르고 있는 시간 (CHARGE_TIME초에 최대), 떼는 순간 실행
 */
export class HumanController {
  private chargeSteps = 0;
  /** 매 스텝 새로 만들지 않도록 재사용하는 킥 의도 */
  private readonly kick: KickIntent = { type: 'shot', power: 0, aimX: 0, aimY: 0 };

  constructor(
    private readonly keys: KeyReader,
    private readonly dt: number,
  ) {}

  /** 현재 충전량 0 ~ 1 (파워 게이지 표시용) */
  get charge(): number {
    return Math.min(1, (this.chargeSteps * this.dt) / SHOT.CHARGE_TIME);
  }

  sample(intent: PlayerIntent): void {
    const k = this.keys;
    let mx = (k.isDown(KEYS.RIGHT) ? 1 : 0) - (k.isDown(KEYS.LEFT) ? 1 : 0);
    let my = (k.isDown(KEYS.DOWN) ? 1 : 0) - (k.isDown(KEYS.UP) ? 1 : 0);
    if (mx !== 0 && my !== 0) {
      mx *= Math.SQRT1_2;
      my *= Math.SQRT1_2;
    }
    intent.moveX = mx;
    intent.moveY = my;
    intent.sprint = k.isDown(KEYS.SPRINT);
    intent.kick = null;

    if (k.isDown(KEYS.SHOOT)) {
      this.chargeSteps++;
    } else if (this.chargeSteps > 0) {
      this.kick.type = 'shot';
      this.kick.power = this.charge;
      this.kick.aimX = mx;
      this.kick.aimY = my;
      intent.kick = this.kick;
      this.chargeSteps = 0;
    }
  }
}
