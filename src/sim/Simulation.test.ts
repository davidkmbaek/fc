import { describe, expect, it } from 'vitest';
import { PROBE } from '../config';
import { Simulation } from './Simulation';

const DT = 1 / 60;

const run = (seed: number, steps: number): Simulation => {
  const sim = new Simulation(DT, seed);
  for (let i = 0; i < steps; i++) sim.step();
  return sim;
};

describe('Simulation', () => {
  it('step()은 tick과 time을 진행한다', () => {
    const sim = run(1, 90);
    expect(sim.curr.tick).toBe(90);
    expect(sim.curr.time).toBeCloseTo(1.5, 9);
  });

  it('prev는 바로 이전 스텝의 상태다', () => {
    const sim = run(1, 10);
    expect(sim.prev.tick).toBe(9);
    expect(sim.prev.probe.angle).toBeCloseTo(sim.curr.probe.angle - PROBE.ANGULAR_SPEED * DT, 9);
    expect(sim.prev.probe).not.toBe(sim.curr.probe);
  });

  it('같은 시드면 같은 상태가 된다 (결정성)', () => {
    expect(run(7, 600).curr).toEqual(run(7, 600).curr);
  });

  it('임시 점은 반지름 위를 돈다', () => {
    const { x, y } = run(1, 123).curr.probe;
    expect(Math.hypot(x, y)).toBeCloseTo(PROBE.RADIUS, 9);
  });
});
