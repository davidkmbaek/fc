import { describe, expect, it } from 'vitest';
import { BALL } from '../../config';
import { createBall } from '../ball';
import { rollDistance } from '../math/rolling';
import { createPlayer } from '../player';
import {
  interceptPoint,
  type Intercept,
  passSafety,
  rollArrivalTime,
  safetyScore,
  typicalPassSpeed,
} from './intercept';
import { BallPrediction } from './predict';

const DT = 1 / 60;
const out = (): Intercept => ({ x: 0, y: 0, t: 0 });

describe('BallPrediction', () => {
  it('굴러가는 공의 궤적은 실제 시뮬레이션과 같고 결국 멈춘다', () => {
    const pred = new BallPrediction(DT);
    const b = createBall();
    b.vx = 10;
    pred.update(b);
    const last = pred.samples[pred.samples.length - 1];
    expect(pred.samples[0]).toMatchObject({ t: 0, x: 0 });
    expect(last?.x).toBeCloseTo(rollDistance(10, 0, BALL.ROLL_DECEL, BALL.ROLL_DAMPING), 0);
    // 원본 공은 바뀌지 않는다
    expect(b.x).toBe(0);
  });
});

describe('interceptPoint', () => {
  it('공 쪽으로 오는 굴러가는 공: 선수 앞에서 바로 만난다', () => {
    const pred = new BallPrediction(DT);
    const b = createBall(20, 0);
    b.vx = -8;
    pred.update(b);
    const p = createPlayer(0, 0, 0, 0, 0);
    const ip = interceptPoint(p, pred.samples, false, out());
    expect(ip.x).toBeGreaterThan(0);
    expect(ip.x).toBeLessThan(20);
    expect(ip.t).toBeLessThan(2.5);
  });

  it('멀어지는 빠른 공: 공이 느려진 뒤 먼 곳에서 만난다', () => {
    const pred = new BallPrediction(DT);
    const b = createBall(0, 0);
    b.vx = 15;
    pred.update(b);
    const near = interceptPoint(createPlayer(0, 0, -1, 0, 0), pred.samples, true, out());
    expect(near.x).toBeGreaterThan(10);
  });

  it('공중 볼은 떨어진 뒤(가슴 높이 아래) 지점을 고른다', () => {
    const pred = new BallPrediction(DT);
    const b = createBall(0, 0);
    b.z = 1;
    b.vx = 10;
    b.vz = 10;
    pred.update(b);
    const p = createPlayer(0, 0, 5, 0, 0); // 공이 머리 위로 지나가는 곳
    const ip = interceptPoint(p, pred.samples, false, out());
    const at = pred.samples.find((s) => s.t === ip.t);
    expect(at?.z ?? 0).toBeLessThanOrEqual(1.5);
    expect(ip.t).toBeGreaterThan(1);
  });

  it('도달 시간이 짧은 선수가 더 이른 가로채기 지점을 얻는다', () => {
    const pred = new BallPrediction(DT);
    const b = createBall(0, 0);
    b.vx = 10;
    pred.update(b);
    const ahead = interceptPoint(createPlayer(0, 0, 12, 3, Math.PI), pred.samples, true, out());
    const behind = interceptPoint(createPlayer(1, 0, -5, 3, 0), pred.samples, true, out());
    expect(ahead.t).toBeLessThan(behind.t);
  });
});

describe('rollArrivalTime', () => {
  it('굴러가는 거리 안이면 유한, 넘으면 Infinity', () => {
    const t = rollArrivalTime(10, 10);
    expect(t).toBeGreaterThan(1);
    expect(t).toBeLessThan(1.5);
    expect(rollArrivalTime(5, 100)).toBe(Infinity);
    expect(rollArrivalTime(5, 0)).toBe(0);
  });
});

describe('passSafety', () => {
  const v0 = typicalPassSpeed(20);

  it('경로에서 먼 상대만 있으면 안전 (여유 큼)', () => {
    const m = passSafety(0, 0, 20, 0, v0, [createPlayer(9, 1, 10, 15)]);
    expect(safetyScore(m)).toBe(1);
  });

  it('경로 한가운데 서 있는 상대는 위험 (여유 음수)', () => {
    const m = passSafety(0, 0, 20, 0, v0, [createPlayer(9, 1, 10, 0.5)]);
    expect(m).toBeLessThan(0);
    expect(safetyScore(m)).toBeLessThan(0);
  });

  it('같은 거리라도 공 출발점 가까이 있는 상대가 더 위험하다 (공이 그 점에 빨리 오지만 상대는 이미 거기 있음)', () => {
    const near = passSafety(0, 0, 20, 0, v0, [createPlayer(9, 1, 4, 3)]);
    const far = passSafety(0, 0, 20, 0, v0, [createPlayer(9, 1, 16, 3)]);
    expect(near).not.toBe(far);
  });

  it('상대가 없으면 Infinity → 점수 1', () => {
    expect(safetyScore(passSafety(0, 0, 20, 0, v0, []))).toBe(1);
  });
});

describe('typicalPassSpeed', () => {
  it('멀수록 빠르다', () => {
    expect(typicalPassSpeed(30)).toBeGreaterThan(typicalPassSpeed(10));
  });
});
