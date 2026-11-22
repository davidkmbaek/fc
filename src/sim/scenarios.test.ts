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

describe('team 시나리오 (5:5)', () => {
  it('홈 5명(+x 공격), 원정 5명(-x 공격), GK-2-1-1', () => {
    const sim = new Simulation(DT, 1, 'team');
    const ps = sim.curr.players;
    expect(ps).toHaveLength(10);
    expect(ps.map((p) => p.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(ps.filter((p) => p.team === 0).map((p) => p.role)).toEqual([
      'GK',
      'DF',
      'DF',
      'MF',
      'FW',
    ]);
    expect(ps[0]?.x).toBeLessThan(-45); // 홈 GK는 -x 골문
    expect(ps[5]?.x).toBeGreaterThan(45); // 원정 GK는 +x 골문
  });

  it('킥오프: 홈 공격수가 공 옆, 원정은 모두 센터 서클 밖', () => {
    const sim = new Simulation(DT, 1, 'team');
    const fw = sim.curr.players[4];
    expect(Math.hypot(fw?.x ?? 99, fw?.y ?? 99)).toBeLessThan(2);
    for (const p of sim.curr.players.filter((q) => q.team === 1)) {
      expect(Math.hypot(p.x, p.y)).toBeGreaterThan(sim.geo.circleRadius);
    }
  });

  it('선수끼리 겹치지 않는다 (달려가 부딪혀도)', () => {
    const sim = new Simulation(DT, 1, 'team');
    const intents = sim.curr.players.map(() => createIntent());
    const fw = intents[4];
    if (fw) fw.moveX = 1; // 원정 공격수(x = +10) 쪽으로 달려간다
    for (let i = 0; i < 60 * 3; i++) sim.step(intents);
    const a = sim.curr.players[4];
    const b = sim.curr.players[9];
    expect(Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0))).toBeGreaterThan(0.79);
  });
});
