import { describe, expect, it } from 'vitest';
import { PLAYER } from '../config';
import { createIntent } from './intent';
import { degToRad } from './math/angle';
import { createPlayer, stepPlayer, turnRate } from './player';

const DT = 1 / 60;

function run(
  seconds: number,
  moveX: number,
  moveY: number,
  sprint = false,
  p = createPlayer(0, 0),
) {
  const intent = createIntent();
  intent.moveX = moveX;
  intent.moveY = moveY;
  intent.sprint = sprint;
  for (let i = 0; i < Math.round(seconds / DT); i++) stepPlayer(p, intent, DT, false);
  return p;
}

describe('stepPlayer — 가속과 최고 속도', () => {
  it('달리기는 RUN_SPEED까지 ACCEL로 가속한다', () => {
    const half = run(0.5, 1, 0);
    expect(half.speed).toBeCloseTo(PLAYER.ACCEL * 0.5, 1);
    expect(run(2, 1, 0).speed).toBeCloseTo(PLAYER.RUN_SPEED);
  });

  it('스프린트는 SPRINT_SPEED까지 간다', () => {
    expect(run(3, 1, 0, true).speed).toBeCloseTo(PLAYER.SPRINT_SPEED);
  });

  it('입력이 없으면 DECEL로 멈춘다', () => {
    const p = run(2, 1, 0);
    run(PLAYER.RUN_SPEED / PLAYER.DECEL + 0.05, 0, 0, false, p);
    expect(p.speed).toBe(0);
  });

  it('작은 입력(데드존 이하)은 무시한다', () => {
    expect(run(1, PLAYER.MOVE_DEADZONE * 0.5, 0).speed).toBe(0);
  });

  it('대각선 입력도 최고 속도를 넘지 않는다', () => {
    const p = run(2, Math.SQRT1_2, Math.SQRT1_2);
    expect(Math.hypot(p.vx, p.vy)).toBeCloseTo(PLAYER.RUN_SPEED);
  });

  it('공을 몰고 가면 DRIBBLE_SPEED_FACTOR만큼 느리다', () => {
    const p = createPlayer(0, 0);
    const intent = createIntent();
    intent.moveX = 1;
    for (let i = 0; i < 120; i++) stepPlayer(p, intent, DT, true);
    expect(p.speed).toBeCloseTo(PLAYER.RUN_SPEED * PLAYER.DRIBBLE_SPEED_FACTOR);
  });
});

describe('stepPlayer — 회전 제한', () => {
  it('회전 속도는 정지 시 720°/s, 스프린트 최고 속도에서 270°/s', () => {
    expect(turnRate(0)).toBeCloseTo(degToRad(PLAYER.TURN_RATE_SLOW_DEG));
    expect(turnRate(PLAYER.SPRINT_SPEED)).toBeCloseTo(degToRad(PLAYER.TURN_RATE_SPRINT_DEG));
  });

  it('스프린트 중 반대 방향 입력: 바로 돌지 못하고 감속하며 돈다', () => {
    const p = run(3, 1, 0, true);
    run(0.1, -1, 0.01, true, p);
    // 0.1초에 최대 72°까지만 회전
    expect(Math.abs(p.facing)).toBeLessThan(degToRad(75));
    expect(p.speed).toBeLessThan(PLAYER.SPRINT_SPEED);
  });

  it('정지 상태에서는 빠르게 돌아선다 (180°에 0.25초 + α)', () => {
    const p = run(0.4, -1, 0.001);
    expect(Math.abs(p.facing)).toBeCloseTo(Math.PI, 1);
  });

  it('방향을 바꾸면 결국 새 방향으로 최고 속도를 낸다', () => {
    const p = run(2, 1, 0);
    run(3, 0, 1, false, p);
    expect(p.facing).toBeCloseTo(Math.PI / 2);
    expect(p.vy).toBeCloseTo(PLAYER.RUN_SPEED);
  });
});
