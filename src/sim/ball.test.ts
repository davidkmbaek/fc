import { describe, expect, it } from 'vitest';
import { BALL } from '../config';
import { bounceOffWorldEdge, createBall, horizontalSpeed, isAirborne, stepBall } from './ball';
import { rollDistance, rollSpeedForDistance } from './math/rolling';

const DT = 1 / 60;

describe('stepBall — 공중과 바운드', () => {
  it('높이 2m에서 떨어뜨리면 튈 때마다 최고 높이가 줄어들고 결국 땅에 머문다', () => {
    const b = createBall();
    b.z = 2;
    const peaks: number[] = [];
    let rising = false;
    let peak = 0;
    for (let i = 0; i < 60 * 10; i++) {
      stepBall(b, DT);
      if (b.vz > 0) {
        rising = true;
        peak = Math.max(peak, b.z);
      } else if (rising) {
        peaks.push(peak);
        rising = false;
        peak = 0;
      }
    }
    expect(peaks.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < peaks.length; i++) expect(peaks[i]).toBeLessThan(peaks[i - 1] ?? 0);
    expect(peaks[0]).toBeLessThan(2);
    expect(isAirborne(b)).toBe(false);
    expect(b.z).toBe(0);
  });

  it('공중에서는 공기 저항으로 수평 속도가 줄어든다', () => {
    const b = createBall();
    b.z = 1;
    b.vz = 5;
    b.vx = 30;
    stepBall(b, DT);
    expect(b.vx).toBeLessThan(30);
    // 30 m/s에서 약 12 m/s² 감속 (DESIGN.md §3)
    expect((30 - b.vx) / DT).toBeGreaterThan(10);
    expect((30 - b.vx) / DT).toBeLessThan(14);
  });

  it('바운드하면 수평 속도에 BOUNCE_FRICTION이 곱해진다', () => {
    const b = createBall();
    b.z = 0.01;
    b.vz = -5;
    b.vx = 10;
    stepBall(b, DT);
    expect(b.z).toBe(0);
    expect(b.vz).toBeGreaterThan(0);
    expect(b.vx).toBeLessThan(10 * BALL.BOUNCE_FRICTION + 1e-9);
  });
});

describe('stepBall — 굴러감', () => {
  it('굴러가는 공은 결국 멈춘다', () => {
    const b = createBall();
    b.vx = 15;
    for (let i = 0; i < 60 * 20; i++) stepBall(b, DT);
    expect(horizontalSpeed(b)).toBe(0);
  });

  it('이동 거리가 해석해 ±10% 안에 든다', () => {
    for (const v0 of [5, 15, 22]) {
      const b = createBall();
      b.vx = v0;
      for (let i = 0; i < 60 * 30; i++) stepBall(b, DT);
      const expected = rollDistance(v0, 0, BALL.ROLL_DECEL, BALL.ROLL_DAMPING);
      expect(b.x).toBeGreaterThan(expected * 0.9);
      expect(b.x).toBeLessThan(expected * 1.1);
    }
  });

  it('패스 속도 공식: 목표 거리에서 도착 속도가 ARRIVE_SPEED ±1 m/s', () => {
    const arrive = 5;
    for (const d of [8, 15, 25]) {
      const v0 = rollSpeedForDistance(d, arrive, BALL.ROLL_DECEL, BALL.ROLL_DAMPING, 40);
      const b = createBall();
      b.vx = v0;
      while (b.x < d) stepBall(b, DT);
      expect(Math.abs(b.vx - arrive)).toBeLessThan(1);
    }
  });

  it('땅에 있는 정지한 공은 움직이지 않는다', () => {
    const b = createBall(3, 4);
    stepBall(b, DT);
    expect(b).toEqual(createBall(3, 4));
  });
});

describe('bounceOffWorldEdge', () => {
  it('월드 밖으로 나간 공을 경계 안으로 되돌리고 속도를 반전한다', () => {
    const b = createBall(60, 0);
    b.vx = 10;
    bounceOffWorldEdge(b, 58.5, 40);
    expect(b.x).toBeCloseTo(58.5 - BALL.RADIUS);
    expect(b.vx).toBeCloseTo(-10 * BALL.BOARD_RESTITUTION);
  });
});
