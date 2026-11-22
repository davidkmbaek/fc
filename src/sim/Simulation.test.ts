import { describe, expect, it } from 'vitest';
import { horizontalSpeed } from './ball';
import { Simulation } from './Simulation';

const DT = 1 / 60;

const runSteps = (sim: Simulation, steps: number): Simulation => {
  for (let i = 0; i < steps; i++) sim.step();
  return sim;
};

describe('Simulation', () => {
  it('step()은 tick과 time을 진행한다', () => {
    const sim = runSteps(new Simulation(DT, 1), 90);
    expect(sim.curr.tick).toBe(90);
    expect(sim.curr.time).toBeCloseTo(1.5, 9);
  });

  it('prev는 바로 이전 스텝의 상태이고 curr와 다른 객체다', () => {
    const sim = new Simulation(DT, 1);
    sim.requestLaunch(20, 0, false);
    runSteps(sim, 10);
    expect(sim.prev.tick).toBe(9);
    expect(sim.prev.ball.x).toBeLessThan(sim.curr.ball.x);
    expect(sim.prev.ball).not.toBe(sim.curr.ball);
  });

  it('같은 시드와 같은 명령이면 같은 상태가 된다 (결정성)', () => {
    const run = (): Simulation => {
      const sim = new Simulation(DT, 7);
      sim.requestLaunch(-15, 10, true);
      return runSteps(sim, 600);
    };
    expect(run().curr).toEqual(run().curr);
  });

  it('땅볼 발사: 클릭 지점 근처에서 멈춘다', () => {
    const sim = new Simulation(DT, 1);
    sim.requestLaunch(20, -10, false);
    runSteps(sim, 60 * 15);
    const b = sim.curr.ball;
    expect(horizontalSpeed(b)).toBe(0);
    expect(Math.hypot(b.x - 20, b.y + 10)).toBeLessThan(1.5);
  });

  it('공중 볼 발사: 공이 떠오른 뒤 다시 땅으로 내려온다', () => {
    const sim = new Simulation(DT, 1);
    sim.requestLaunch(30, 0, true);
    let maxZ = 0;
    for (let i = 0; i < 60 * 10; i++) {
      sim.step();
      maxZ = Math.max(maxZ, sim.curr.ball.z);
    }
    expect(maxZ).toBeGreaterThan(2);
    expect(sim.curr.ball.z).toBe(0);
  });

  it('공은 월드 밖으로 나가지 않는다', () => {
    const sim = new Simulation(DT, 1);
    sim.requestLaunch(200, 0, false);
    runSteps(sim, 60 * 10);
    expect(Math.abs(sim.curr.ball.x)).toBeLessThanOrEqual(sim.geo.worldHalfLength);
  });
});
