import { describe, expect, it } from 'vitest';
import { PLAYER } from '../config';
import { collidePlayers } from './collision';
import { createPlayer } from './player';

describe('collidePlayers', () => {
  it('겹친 두 선수를 반씩 밀어내 딱 붙은 거리로 만든다', () => {
    const a = createPlayer(0, 0, 0, 0);
    const b = createPlayer(1, 1, 0.5, 0);
    collidePlayers([a, b], -1);
    expect(b.x - a.x).toBeCloseTo(PLAYER.RADIUS * 2);
    expect(a.x).toBeCloseTo(-(PLAYER.RADIUS * 2 - 0.5) / 2);
  });

  it('겹치지 않으면 그대로', () => {
    const a = createPlayer(0, 0, 0, 0);
    const b = createPlayer(1, 1, 2, 0);
    collidePlayers([a, b], -1);
    expect([a.x, b.x]).toEqual([0, 2]);
  });

  it('공을 가진 선수가 다가가며 부딪히면 느려진다', () => {
    const owner = createPlayer(0, 0, 0, 0);
    owner.speed = 6;
    owner.vx = 6;
    const other = createPlayer(1, 1, 0.7, 0);
    collidePlayers([owner, other], 0);
    expect(owner.speed).toBeCloseTo(6 * PLAYER.BUMP_SPEED_FACTOR);
  });

  it('멀어지는 중이면 느려지지 않는다', () => {
    const owner = createPlayer(0, 0, 0, 0);
    owner.speed = 6;
    owner.vx = -6;
    collidePlayers([owner, createPlayer(1, 1, 0.7, 0)], 0);
    expect(owner.speed).toBe(6);
  });

  it('정확히 같은 위치여도 결정적으로 떼어 놓는다', () => {
    const a = createPlayer(0, 0, 3, 3);
    const b = createPlayer(1, 1, 3, 3);
    collidePlayers([a, b], -1);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(PLAYER.RADIUS * 2);
  });
});
