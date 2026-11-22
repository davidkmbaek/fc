import { KEYS } from '../config';
import type { PlayerIntent } from '../sim/intent';
import type { KeyReader } from './keyboard';

/**
 * 키 상태 → PlayerIntent. 시뮬레이션 스텝마다 한 번 호출한다(누른 시간 계산이 스텝 단위라 결정적).
 * DESIGN.md §5
 */
export class HumanController {
  constructor(private readonly keys: KeyReader) {}

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
  }
}
