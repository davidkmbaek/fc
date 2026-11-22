import { describe, expect, it } from 'vitest';
import { DRIBBLE, PLAYER } from '../config';
import { createBall } from './ball';
import { canControl, canKick, collideBallWithPlayer, possessorId, tryTouch } from './dribble';
import { createIntent, type PlayerIntent } from './intent';
import { createPlayer } from './player';
import { Simulation } from './Simulation';

const DT = 1 / 60;

function moving(sprint = false): PlayerIntent {
  const i = createIntent();
  i.moveX = 1;
  i.sprint = sprint;
  return i;
}

describe('canControl', () => {
  it('거리·높이·상대 속도 조건을 모두 만족해야 한다', () => {
    const p = createPlayer(0, 0);
    expect(canControl(p, createBall(0.5, 0))).toBe(true);
    expect(canControl(p, createBall(DRIBBLE.CONTROL_RADIUS + 0.01, 0))).toBe(false);
    const high = createBall(0.5, 0);
    high.z = DRIBBLE.CONTROL_MAX_Z;
    expect(canControl(p, high)).toBe(false);
    const fast = createBall(0.5, 0);
    fast.vx = DRIBBLE.CONTROL_MAX_REL_SPEED + 1;
    expect(canControl(p, fast)).toBe(false);
  });

  it('상대 속도로 판단한다: 같이 달리는 선수에게는 빠른 공도 컨트롤 가능', () => {
    const p = createPlayer(0, 0);
    p.vx = 6;
    const b = createBall(0.5, 0);
    b.vx = 6 + DRIBBLE.CONTROL_MAX_REL_SPEED - 1;
    expect(canControl(p, b)).toBe(true);
  });
});

describe('tryTouch', () => {
  it('움직이는 선수는 보는 방향으로 (속도 + TOUCH_BOOST)로 공을 찬다', () => {
    const p = createPlayer(3, 0);
    p.speed = 5;
    p.vx = 5;
    const b = createBall(0.5, 0);
    expect(tryTouch(p, moving(), b, 1)).toBe(true);
    expect(b.vx).toBeCloseTo(5 + DRIBBLE.TOUCH_BOOST);
    expect(b.lastTouchPlayer).toBe(3);
    expect(p.cooldown).toBe(DRIBBLE.TOUCH_COOLDOWN);
  });

  it('스프린트 중에는 TOUCH_BOOST_SPRINT로 더 멀리 찬다', () => {
    const p = createPlayer(0, 0);
    p.speed = 8;
    p.vx = 8;
    // 스프린트 드리블 중인 공 (정지한 공은 상대 속도 8 > 7이라 컨트롤 불가)
    const b = createBall(0.5, 0);
    b.vx = 5;
    expect(tryTouch(p, moving(true), b, 0)).toBe(true);
    expect(b.vx).toBeCloseTo(8 + DRIBBLE.TOUCH_BOOST_SPRINT);
  });

  it('쿨다운 중, 서 있을 때, 공이 뒤에 있을 때는 터치하지 않는다', () => {
    const p = createPlayer(0, 0);
    p.speed = 5;
    p.cooldown = 0.1;
    expect(tryTouch(p, moving(), createBall(0.5, 0), 0)).toBe(false);
    p.cooldown = 0;
    expect(tryTouch(p, createIntent(), createBall(0.5, 0), 0)).toBe(false);
    expect(tryTouch(p, moving(), createBall(-0.5, 0), 0)).toBe(false);
  });
});

describe('collideBallWithPlayer', () => {
  it('선수 몸 안의 공을 밖으로 밀어내고 튕긴다', () => {
    const p = createPlayer(0, 0);
    const b = createBall(0.2, 0);
    b.vx = -5;
    expect(collideBallWithPlayer(b, p, 0)).toBe(true);
    expect(b.x).toBeGreaterThanOrEqual(PLAYER.RADIUS);
    expect(b.vx).toBeGreaterThan(0);
  });

  it('머리 위로 지나가는 공은 맞지 않는다', () => {
    const b = createBall(0.2, 0);
    b.z = PLAYER.HEIGHT + 0.1;
    expect(collideBallWithPlayer(b, createPlayer(0, 0), 0)).toBe(false);
  });
});

describe('드리블 (Simulation)', () => {
  function dribble(seconds: number, sprint: boolean): { sim: Simulation; maxGap: number } {
    const sim = new Simulation(DT, 1);
    const intents = [moving(sprint)];
    let maxGap = 0;
    for (let i = 0; i < Math.round(seconds / DT); i++) {
      sim.step(intents);
      const p = sim.curr.players[0];
      const b = sim.curr.ball;
      if (p && i > 60) maxGap = Math.max(maxGap, Math.hypot(b.x - p.x, b.y - p.y));
    }
    return { sim, maxGap };
  }

  it('3초 동안 달리며 공을 계속 소유한다 (공이 선수와 함께 전진)', () => {
    const { sim, maxGap } = dribble(3, false);
    expect(possessorId(sim.curr.players, sim.curr.ball)).toBe(0);
    expect(sim.curr.ball.x).toBeGreaterThan(12);
    expect(maxGap).toBeLessThan(DRIBBLE.CONTROL_RADIUS * 2);
  });

  it('일반 드리블 중에는 언제든 킥할 수 있다', () => {
    const sim = new Simulation(DT, 1);
    const intents = [moving(false)];
    let controllable = 0;
    const steps = 180;
    for (let i = 0; i < 60 + steps; i++) {
      sim.step(intents);
      const p = sim.curr.players[0];
      if (p && i >= 60 && canKick(p, sim.curr.ball)) controllable++;
    }
    expect(controllable / steps).toBe(1);
  });

  it('스프린트 드리블은 공이 더 멀리 나간다 (뺏기기 쉬움)', () => {
    expect(dribble(3, true).maxGap).toBeGreaterThan(dribble(3, false).maxGap);
  });

  it('드리블 중에는 DRIBBLE_SPEED_FACTOR만큼 느리다', () => {
    const { sim } = dribble(3, false);
    expect(sim.curr.players[0]?.speed).toBeCloseTo(
      PLAYER.RUN_SPEED * PLAYER.DRIBBLE_SPEED_FACTOR,
      1,
    );
  });
});
