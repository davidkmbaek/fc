import { describe, expect, it } from 'vitest';
import { createIntent, type PlayerIntent } from '../sim/intent';
import type { PlayerState } from '../sim/player';
import { Simulation } from '../sim/Simulation';
import { TeamControl } from './teamControl';

const DT = 1 / 60;

/** team 시나리오: 홈 0 GK, 1·2 DF, 3 MF, 4 FW(공 옆). 원정 5~9 */
function setup(): { sim: Simulation; tc: TeamControl; intents: PlayerIntent[] } {
  const sim = new Simulation(DT, 1, 'team');
  const tc = new TeamControl(4, 0, sim.curr.ball.lastTouchPlayer);
  return { sim, tc, intents: sim.curr.players.map(() => createIntent()) };
}

describe('TeamControl — 수동 전환 (Q)', () => {
  it('방향 입력 없이 Q: 공에 가장 빨리 닿는 동료 (현재 선수·GK 제외)', () => {
    const { sim, tc } = setup();
    const intent = createIntent();
    intent.switchPlayer = true;
    expect(tc.beforeStep(intent, sim.curr)).toBe(4);
    expect(tc.controlledId).toBe(3); // 미드필더(-18, 0)가 다음으로 가깝다
  });

  it('방향키 + Q: 그 방향의 동료', () => {
    const { sim, tc } = setup();
    const intent = createIntent();
    intent.switchPlayer = true;
    intent.moveX = -0.7;
    intent.moveY = 0.7; // 왼쪽 아래 → (-32, 12) 수비수 2번
    tc.beforeStep(intent, sim.curr);
    expect(tc.controlledId).toBe(2);
  });

  it('Q를 누르지 않으면 그대로', () => {
    const { sim, tc } = setup();
    expect(tc.beforeStep(createIntent(), sim.curr)).toBe(-1);
    expect(tc.controlledId).toBe(4);
  });
});

describe('TeamControl — 자동 전환', () => {
  it('우리 팀 패스를 받을 동료로 바로 바뀐다', () => {
    const { sim, tc, intents } = setup();
    const i4 = intents[4] as PlayerIntent;
    i4.kick = { type: 'pass', power: 0.3, aimX: -1, aimY: 0 };
    sim.step(intents);
    expect(tc.afterStep(sim.curr)).toBe(4);
    expect(tc.controlledId).toBe(3);
  });

  it('상대가 공을 건드리면 바뀌지 않는다', () => {
    const { sim, tc } = setup();
    const away = sim.curr.players[9] as PlayerState;
    sim.curr.ball.lastTouchPlayer = away.id;
    sim.curr.ball.lastTouchTeam = 1;
    expect(tc.afterStep(sim.curr)).toBe(-1);
    expect(tc.controlledId).toBe(4);
  });

  it('조종하지 않던 동료가 공을 건드리면 그 선수로 바뀐다', () => {
    const { sim, tc } = setup();
    sim.curr.ball.lastTouchPlayer = 1;
    sim.curr.ball.lastTouchTeam = 0;
    tc.afterStep(sim.curr);
    expect(tc.controlledId).toBe(1);
  });
});
