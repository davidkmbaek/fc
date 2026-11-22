import type { KickType } from './intent';
import type { OutLine } from './lines';
import type { Restart } from './rules';

/**
 * 시뮬레이션이 내보내는 이벤트 (CLAUDE.md 규칙 6).
 * 렌더링·사운드·UI는 구독만 하고 시뮬레이션 상태를 바꾸지 않는다.
 */
export type SimEvent =
  | { type: 'goal'; tick: number; side: 1 | -1; team: number }
  | {
      type: 'out';
      tick: number;
      line: OutLine;
      side: 1 | -1;
      x: number;
      y: number;
      restart: Restart;
      team: number;
    }
  | { type: 'frameHit'; tick: number; part: 'post' | 'crossbar' }
  | {
      type: 'kick';
      tick: number;
      playerId: number;
      kind: KickType;
      power: number;
      /** 받을 동료 id (-1 = 슛·공간으로) */
      targetId: number;
    }
  | {
      type: 'tackle';
      tick: number;
      playerId: number;
      kind: 'stand' | 'slide';
      /** won: 공을 빼앗음/쳐냄, failed: 헛손질, fall: 사람을 먼저 맞혀 둘 다 넘어짐 */
      result: 'won' | 'failed' | 'fall';
    }
  | { type: 'save'; tick: number; playerId: number; kind: 'catch' | 'parry' }
  | { type: 'whistle'; tick: number; kind: 'kickOff' | 'halfTime' | 'fullTime'; half: 1 | 2 }
  | { type: 'ballReset'; tick: number };
