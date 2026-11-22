import { describe, expect, it } from 'vitest';
import { createIntent } from './intent';
import { isScenarioId } from './scenarios';
import { Simulation } from './Simulation';

const DT = 1 / 60;

describe('시나리오', () => {
  it('isScenarioId', () => {
    expect(isScenarioId('penalty')).toBe(true);
    expect(isScenarioId('corner')).toBe(false);
  });

  it('freeplay: 공은 센터 스폿, 선수는 공 바로 뒤', () => {
    const sim = new Simulation(DT, 1, 'freeplay');
    expect(sim.curr.ball).toMatchObject({ x: 0, y: 0, z: 0 });
    expect(sim.curr.players[0]?.x).toBeLessThan(0);
  });

  it('penalty: 공은 +x 페널티 스폿, 키커는 그 뒤에서 골문을 본다', () => {
    const sim = new Simulation(DT, 1, 'penalty');
    expect(sim.curr.ball.x).toBeCloseTo(sim.geo.penaltySpotX);
    const p = sim.curr.players[0];
    expect(p?.x).toBeLessThan(sim.geo.penaltySpotX);
    expect(p?.facing).toBe(0);
    expect(sim.prev.ball.x).toBeCloseTo(sim.geo.penaltySpotX);
  });

  it('penalty: 달려가서 슛 → 골 → 공과 키커가 제자리로 돌아온다', () => {
    const sim = new Simulation(DT, 3, 'penalty');
    const intent = createIntent();
    intent.moveX = 1;
    let kicked = false;
    for (let i = 0; i < 60 * 6; i++) {
      intent.kick = null;
      const p = sim.curr.players[0];
      if (!kicked && p && sim.curr.ball.x - p.x < 0.8) {
        intent.kick = { type: 'shot', power: 0.6, aimX: 0, aimY: 0 };
        kicked = true;
      }
      if (kicked) intent.moveX = 0;
      sim.step([intent]);
    }
    const types = sim.drainEvents().map((e) => e.type);
    expect(types).toContain('goal');
    expect(types).toContain('ballReset');
    expect(sim.curr.ball.x).toBeCloseTo(sim.geo.penaltySpotX);
    expect(sim.curr.players[0]?.x).toBeCloseTo(sim.geo.penaltySpotX - 2);
  });

  it('freeplay: 골·아웃 뒤에는 공만 센터로 돌아오고 선수는 그대로', () => {
    const sim = new Simulation(DT, 1, 'freeplay');
    const p = sim.curr.players[0];
    if (p) p.y = 10; // 공 경로 밖
    sim.requestLaunch(60, 0, false);
    for (let i = 0; i < 60 * 6; i++) sim.step();
    expect(sim.curr.ball).toMatchObject({ x: 0, y: 0 });
    expect(sim.curr.players[0]?.y).toBe(10);
  });
});
