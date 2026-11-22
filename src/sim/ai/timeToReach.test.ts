import { describe, expect, it } from 'vitest';
import { PLAYER } from '../../config';
import { createPlayer } from '../player';
import { timeToReach } from './timeToReach';

describe('timeToReach (간이)', () => {
  it('제자리는 0', () => {
    expect(timeToReach(createPlayer(0, 0, 3, 4), 3, 4)).toBe(0);
  });

  it('먼 거리는 대략 거리 / RUN_SPEED + 가속 손실', () => {
    const t = timeToReach(createPlayer(0, 0, 0, 0, 0), 60, 0);
    const accelLoss = PLAYER.RUN_SPEED / PLAYER.ACCEL / 2;
    expect(t).toBeCloseTo(60 / PLAYER.RUN_SPEED + accelLoss, 5);
  });

  it('뒤를 보고 있으면 같은 거리라도 더 오래 걸린다', () => {
    const facing = createPlayer(0, 0, 0, 0, 0);
    const back = createPlayer(1, 0, 0, 0, Math.PI);
    expect(timeToReach(back, 10, 0)).toBeGreaterThan(timeToReach(facing, 10, 0));
  });

  it('이미 그쪽으로 달리는 선수가 더 빨리 도착한다 (거리가 아니라 도달 시간)', () => {
    const running = createPlayer(0, 0, 0, 0, 0);
    running.speed = PLAYER.RUN_SPEED;
    const standing = createPlayer(1, 0, 1, 0, Math.PI);
    // standing이 1m 더 가깝지만 반대를 보고 서 있다
    expect(timeToReach(running, 10, 0)).toBeLessThan(timeToReach(standing, 10, 0));
  });
});
