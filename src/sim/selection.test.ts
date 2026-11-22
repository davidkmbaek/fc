import { describe, expect, it } from 'vitest';
import { createPlayer } from './player';
import { nearestPlayerId } from './selection';

describe('nearestPlayerId', () => {
  const players = [
    createPlayer(0, 0, -50, 0, 0, 'GK'),
    createPlayer(1, 0, -10, 0),
    createPlayer(2, 0, 5, 5),
    createPlayer(3, 1, 0, 0),
  ];

  it('같은 팀에서 가장 가까운 선수', () => {
    expect(nearestPlayerId(players, 0, 0, 0)).toBe(2);
    expect(nearestPlayerId(players, 1, 0, 0)).toBe(3);
  });

  it('골키퍼는 기본적으로 제외', () => {
    expect(nearestPlayerId(players, 0, -49, 0)).toBe(1);
    expect(nearestPlayerId(players, 0, -49, 0, true)).toBe(0);
  });
});
