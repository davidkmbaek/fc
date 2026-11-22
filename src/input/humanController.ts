import { KEYS, SHOT } from '../config';
import type { KickIntent, KickType, PlayerIntent } from '../sim/intent';
import type { KeyReader } from './keyboard';

/** 킥 버튼 → 킥 종류. DESIGN.md §5 키 배치 */
const KICK_KEYS: readonly { key: string; type: KickType }[] = [
  { key: KEYS.PASS, type: 'pass' },
  { key: KEYS.THROUGH, type: 'through' },
  { key: KEYS.LOB, type: 'lob' },
  { key: KEYS.SHOOT, type: 'shot' },
];

/**
 * 키 상태 → PlayerIntent. 시뮬레이션 스텝마다 한 번 호출한다(누른 시간을 스텝 수로 세므로 결정적).
 * DESIGN.md §5
 * - 킥 세기: 버튼을 누르고 있는 시간 (CHARGE_TIME초에 최대), 떼는 순간 실행
 * - 충전 중에는 처음 누른 킥 버튼만 본다
 * - 수비 중(상대가 공을 가짐)에는 S = 스탠딩 태클, A = 슬라이딩 태클 (누르는 순간)
 */
export class HumanController {
  private chargeSteps = 0;
  private switchWasDown = false;
  private passWasDown = false;
  private lobWasDown = false;
  private chargeKey: { key: string; type: KickType } | null = null;
  /** 매 스텝 새로 만들지 않도록 재사용하는 킥 의도 */
  private readonly kick: KickIntent = { type: 'shot', power: 0, aimX: 0, aimY: 0 };

  constructor(
    private readonly keys: KeyReader,
    private readonly dt: number,
  ) {}

  /** 현재 충전량 0 ~ 1 (파워 게이지 표시용) */
  get charge(): number {
    if (!this.chargeKey) return 0;
    return Math.min(1, (this.chargeSteps * this.dt) / SHOT.CHARGE_TIME);
  }

  /** 충전 중인 킥 종류 (없으면 null) */
  get chargingType(): KickType | null {
    return this.chargeKey?.type ?? null;
  }

  /** 조종 선수가 바뀔 때: 충전을 버린다 */
  reset(): void {
    this.chargeKey = null;
    this.chargeSteps = 0;
  }

  /** defending: 상대 팀이 공을 소유하고 있다 */
  sample(intent: PlayerIntent, defending = false): void {
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
    const switchDown = k.isDown(KEYS.SWITCH);
    intent.switchPlayer = switchDown && !this.switchWasDown;
    this.switchWasDown = switchDown;

    const passDown = k.isDown(KEYS.PASS);
    const lobDown = k.isDown(KEYS.LOB);
    intent.tackle = null;
    if (defending && !this.chargeKey) {
      if (passDown && !this.passWasDown) intent.tackle = 'stand';
      else if (lobDown && !this.lobWasDown) intent.tackle = 'slide';
    }
    this.passWasDown = passDown;
    this.lobWasDown = lobDown;

    if (!this.chargeKey) {
      // 수비 중 S·A는 태클이므로 킥 충전을 시작하지 않는다
      this.chargeKey =
        KICK_KEYS.find(
          (c) => k.isDown(c.key) && !(defending && (c.key === KEYS.PASS || c.key === KEYS.LOB)),
        ) ?? null;
      if (this.chargeKey) this.chargeSteps = 1;
      return;
    }
    if (k.isDown(this.chargeKey.key)) {
      this.chargeSteps++;
      return;
    }
    // 뗐다: 킥 실행
    this.kick.type = this.chargeKey.type;
    this.kick.power = this.charge;
    this.kick.aimX = mx;
    this.kick.aimY = my;
    intent.kick = this.kick;
    this.reset();
  }
}
