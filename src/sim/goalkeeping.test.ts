import { describe, expect, it } from 'vitest';
import { AI_GK } from '../config';
import { createBall } from './ball';
import { goalkeeperHands, holdBall, inOwnPenaltyArea } from './goalkeeping';
import { createIntent, type PlayerIntent } from './intent';
import { computePitchGeometry } from './pitch';
import { createPlayer, type PlayerState } from './player';
import { Rng } from './rng';
import { Simulation } from './Simulation';
import { standTackle } from './tackle';

const geo = computePitchGeometry();
const OWN_GOAL = -geo.halfLength; // 홈 GK(+x 공격)가 지키는 골문
const gk = (): PlayerState => createPlayer(0, 0, -51, 0, 0, 'GK');

/** 원정 선수가 찬 공 (x, y)에서 vx로 홈 골문 쪽 */
function shot(x: number, y: number, vx: number) {
  const b = createBall(x, y);
  b.vx = vx;
  b.lastTouchPlayer = 9;
  b.lastTouchTeam = 1;
  return b;
}

describe('inOwnPenaltyArea', () => {
  it('자기 쪽 페널티 에어리어만', () => {
    expect(inOwnPenaltyArea(-45, 5, OWN_GOAL, geo)).toBe(true);
    expect(inOwnPenaltyArea(-30, 5, OWN_GOAL, geo)).toBe(false);
    expect(inOwnPenaltyArea(45, 5, OWN_GOAL, geo)).toBe(false);
  });
});

describe('goalkeeperHands', () => {
  it('손 닿는 곳의 느린 공은 잡는다 (heldBy)', () => {
    const p = gk();
    const b = shot(-50.4, 0.3, -10);
    expect(goalkeeperHands(p, b, OWN_GOAL, geo, new Rng(1), 0)).toBe('catch');
    expect(b.heldBy).toBe(0);
    expect(b.vx).toBe(0);
  });

  it('빠른 공은 쳐낸다: 골문 반대쪽 + 옆으로', () => {
    const p = gk();
    const b = shot(-50.5, 0.2, -18);
    expect(goalkeeperHands(p, b, OWN_GOAL, geo, new Rng(1), 0)).toBe('parry');
    expect(b.heldBy).toBe(-1);
    expect(b.vx).toBeGreaterThan(0);
    expect(Math.abs(b.vy)).toBeGreaterThanOrEqual(AI_GK.PARRY_SIDE_MIN);
  });

  it('손이 닿지 않거나, 너무 높거나, 페널티 에어리어 밖이면 처리하지 않는다', () => {
    expect(goalkeeperHands(gk(), shot(-51, 3, -10), OWN_GOAL, geo, new Rng(1), 0)).toBeNull();
    const high = shot(-50.5, 0, -10);
    high.z = AI_GK.MAX_Z + 0.1;
    expect(goalkeeperHands(gk(), high, OWN_GOAL, geo, new Rng(1), 0)).toBeNull();
    const out = createPlayer(0, 0, -30, 0, 0, 'GK');
    expect(goalkeeperHands(out, shot(-30.3, 0, -10), OWN_GOAL, geo, new Rng(1), 0)).toBeNull();
  });

  it('같은 팀이 보낸 공(백패스)은 손으로 잡지 않는다', () => {
    const b = shot(-50.4, 0, -6);
    b.lastTouchTeam = 0;
    expect(goalkeeperHands(gk(), b, OWN_GOAL, geo, new Rng(1), 0)).toBeNull();
  });

  it('다이빙 중에는 더 멀리 닿는다', () => {
    const p = gk();
    p.action = 'slide';
    expect(goalkeeperHands(p, shot(-51, 1.5, -10), OWN_GOAL, geo, new Rng(1), 0)).toBe('catch');
  });
});

describe('공 들기와 배급 (Simulation)', () => {
  it('든 공은 골키퍼를 따라다니고, 태클로 뺏을 수 없다', () => {
    const p = gk();
    const b = shot(-50.4, 0, -10);
    goalkeeperHands(p, b, OWN_GOAL, geo, new Rng(1), 0);
    p.x = -48;
    holdBall(b, p, 1 / 60);
    expect(b.x).toBeCloseTo(-48 + 0.3);
    expect(b.z).toBe(AI_GK.HOLD_Z);
    const opp = createPlayer(9, 1, -47, 0, Math.PI);
    expect(standTackle(opp, [p, opp], b, new Rng(1), 0)).toBe('failed');
  });

  it('골문으로 온 느린 슛을 잡고, 킥 의도로 배급하면 공이 다시 움직인다', () => {
    const sim = new Simulation(1 / 60, 1, 'team');
    const intents: PlayerIntent[] = sim.curr.players.map(() => createIntent());
    const b = sim.curr.ball;
    b.x = -45;
    b.y = 0;
    b.vx = -12;
    b.lastTouchPlayer = 9;
    b.lastTouchTeam = 1;
    for (let i = 0; i < 60; i++) sim.step(intents);
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({ type: 'save', kind: 'catch' }),
    );
    expect(sim.curr.ball.heldBy).toBe(0);
    (intents[0] as PlayerIntent).kick = { type: 'pass', power: 0.5, aimX: 1, aimY: 0.6 };
    sim.step(intents);
    (intents[0] as PlayerIntent).kick = null;
    for (let i = 0; i < 10; i++) sim.step(intents);
    expect(sim.curr.ball.heldBy).toBe(-1);
    expect(Math.hypot(sim.curr.ball.vx, sim.curr.ball.vy)).toBeGreaterThan(3);
  });
});
