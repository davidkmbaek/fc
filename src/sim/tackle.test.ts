import { describe, expect, it } from 'vitest';
import { TACKLE } from '../config';
import { createBall } from './ball';
import { createIntent, type PlayerIntent } from './intent';
import { createPlayer, type PlayerState } from './player';
import { Rng } from './rng';
import { Simulation } from './Simulation';
import { standTackle, standTackleChance } from './tackle';

const DT = 1 / 60;

/** 공을 가진 원정 선수(5, 0, -x를 봄)와 그 앞의 공 */
function carrierAndBall(): { carrier: PlayerState; ball: ReturnType<typeof createBall> } {
  const carrier = createPlayer(1, 1, 5, 0, Math.PI);
  const ball = createBall(4.4, 0);
  ball.lastTouchPlayer = 1;
  ball.lastTouchTeam = 1;
  return { carrier, ball };
}

describe('standTackleChance', () => {
  it('정면이 등 뒤보다, 가까운 쪽이 먼 쪽보다 성공률이 높다', () => {
    const { carrier } = carrierAndBall();
    const front = createPlayer(0, 0, 4, 0);
    const behind = createPlayer(0, 0, 6, 0);
    expect(standTackleChance(front, 0.5, carrier)).toBeGreaterThan(
      standTackleChance(behind, 0.5, carrier),
    );
    expect(standTackleChance(front, 0.3, carrier)).toBeGreaterThan(
      standTackleChance(front, 1.2, carrier),
    );
  });
});

describe('standTackle', () => {
  it('정면 근거리 태클은 대부분 성공하고, 공은 태클한 선수 발밑(상대 반대쪽)으로 온다', () => {
    let won = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const { carrier, ball } = carrierAndBall();
      const t = createPlayer(0, 0, 3.8, 0, 0);
      if (standTackle(t, [t, carrier], ball, new Rng(seed), 0) === 'won') {
        won++;
        expect(ball.lastTouchPlayer).toBe(0);
        expect(Math.hypot(ball.x - t.x, ball.y - t.y)).toBeCloseTo(TACKLE.STAND_BALL_OFFSET);
        expect(ball.x).toBeLessThan(t.x); // 상대(+x) 반대쪽
        expect(carrier.cooldown).toBe(TACKLE.BEATEN_TIME);
      }
    }
    expect(won).toBeGreaterThan(60);
  });

  it('등 뒤에서는 성공률이 크게 낮다', () => {
    let won = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const { carrier, ball } = carrierAndBall();
      const t = createPlayer(0, 0, 4.4, 1.0, -Math.PI / 2);
      t.x = 5.9; // 공 가진 선수 등 뒤 (공까지 1.5m → 범위 밖이 되지 않게 공을 옮김)
      ball.x = 5.3;
      if (standTackle(t, [t, carrier], ball, new Rng(seed), 0) === 'won') won++;
    }
    expect(won).toBeLessThan(45);
  });

  it('범위 밖이면 실패하고 STAND_FAIL_STUN초 행동 불가', () => {
    const { carrier, ball } = carrierAndBall();
    const t = createPlayer(0, 0, 0, 0);
    expect(standTackle(t, [t, carrier], ball, new Rng(1), 0)).toBe('failed');
    expect(t.action).toBe('stunned');
    expect(t.actionTime).toBe(TACKLE.STAND_FAIL_STUN);
  });
});

/** tackle 시나리오에서 홈 수비수(0)가 intent로 행동 */
function tackleScenario(seed: number): { sim: Simulation; intents: PlayerIntent[] } {
  const sim = new Simulation(DT, seed, 'tackle');
  return { sim, intents: sim.curr.players.map(() => createIntent()) };
}

describe('슬라이딩 태클 (Simulation)', () => {
  it('옆에서 공을 향해 미끄러져 공을 쳐내고, 이후 회복 시간 동안 움직이지 못한다', () => {
    const { sim, intents } = tackleScenario(1);
    const i0 = intents[0] as PlayerIntent;
    const p = sim.curr.players[0] as PlayerState;
    // 공(5.4, 0)의 3.2m 위쪽에서 아래(+y)로 미끄러진다
    p.x = sim.curr.ball.x;
    p.y = -3.2;
    i0.moveY = 1;
    i0.tackle = 'slide';
    sim.step(intents);
    i0.tackle = null;
    expect(p.action).toBe('slide');
    for (let i = 0; i < 30; i++) sim.step(intents);
    const events = sim.drainEvents();
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'tackle', kind: 'slide', result: 'won' }),
    );
    expect(sim.curr.ball.lastTouchPlayer).toBe(0);
    expect(sim.curr.ball.vy).toBeGreaterThan(0);
    // 미끄러진 거리 ≈ SLIDE_DIST, 회복 중에는 입력해도 움직이지 않는다
    expect(p.y + 3.2).toBeCloseTo(TACKLE.SLIDE_DIST, 0);
    i0.moveY = -1;
    const y = p.y;
    for (let i = 0; i < 20; i++) sim.step(intents);
    expect(p.action).toBe('stunned');
    expect(p.y).toBeCloseTo(y, 1);
    for (let i = 0; i < 60; i++) sim.step(intents);
    expect(p.action).toBe('none');
  });

  it('공보다 사람을 먼저 맞히면 둘 다 넘어진다', () => {
    const { sim, intents } = tackleScenario(1);
    const i0 = intents[0] as PlayerIntent;
    const p = sim.curr.players[0] as PlayerState;
    const carrier = sim.curr.players[1] as PlayerState;
    // 공을 선수 뒤쪽으로 옮겨, 왼쪽에서 미끄러지면 사람이 먼저 닿게 한다
    sim.curr.ball.x = carrier.x + 0.6;
    p.x = carrier.x - 3;
    i0.tackle = 'slide';
    sim.step(intents);
    i0.tackle = null;
    for (let i = 0; i < 30; i++) sim.step(intents);
    expect(sim.drainEvents()).toContainEqual(expect.objectContaining({ result: 'fall' }));
    expect(p.action).toBe('fallen');
    expect(carrier.action).toBe('fallen');
  });
});

describe('스탠딩 태클로 공 뺏기 (2단계 완료 조건)', () => {
  it('공 가진 상대에게 다가가 S로 태클 → 대부분의 시드에서 공을 뺏는다', () => {
    let won = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const { sim, intents } = tackleScenario(seed);
      const i0 = intents[0] as PlayerIntent;
      i0.moveX = 1;
      for (let i = 0; i < 120; i++) {
        const p = sim.curr.players[0] as PlayerState;
        const b = sim.curr.ball;
        i0.tackle = Math.hypot(b.x - p.x, b.y - p.y) < 0.9 && p.action === 'none' ? 'stand' : null;
        if (i0.tackle) i0.moveX = 0;
        sim.step(intents);
        if (sim.curr.ball.lastTouchTeam === 0) break;
      }
      if (sim.curr.ball.lastTouchTeam === 0) won++;
    }
    expect(won).toBeGreaterThan(14);
  });
});
