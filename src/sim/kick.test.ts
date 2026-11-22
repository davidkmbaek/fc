import { describe, expect, it } from 'vitest';
import { SHOT } from '../config';
import { createBall } from './ball';
import { createIntent, type KickIntent } from './intent';
import { executeShot, shotErrorRad, shotTargetY } from './kick';
import { computePitchGeometry } from './pitch';
import { createPlayer } from './player';
import { Rng } from './rng';
import { Simulation } from './Simulation';

const geo = computePitchGeometry();
const DT = 1 / 60;
const shot = (power: number, aimY = 0): KickIntent => ({ type: 'shot', power, aimX: 0, aimY });

describe('슛 계산', () => {
  it('조준 y: 중립이면 가운데, 위·아래면 해당 포스트 안쪽', () => {
    expect(shotTargetY(0, geo)).toBe(0);
    expect(shotTargetY(-1, geo)).toBeCloseTo(-(geo.goalHalfWidth - SHOT.POST_MARGIN));
    expect(shotTargetY(1, geo)).toBeCloseTo(geo.goalHalfWidth - SHOT.POST_MARGIN);
  });

  it('세게 찰수록 빠르고, 높이 뜨고, 부정확하다', () => {
    const soft = createBall(40, 0);
    const hard = createBall(40, 0);
    executeShot(soft, createPlayer(0, 0, 39.5), shot(0.2), 1, geo, new Rng(1));
    executeShot(hard, createPlayer(0, 0, 39.5), shot(1), 1, geo, new Rng(1));
    expect(Math.hypot(hard.vx, hard.vy)).toBeCloseTo(SHOT.MAX_SPEED);
    expect(Math.hypot(hard.vx, hard.vy)).toBeGreaterThan(Math.hypot(soft.vx, soft.vy));
    expect(hard.vz).toBeGreaterThan(soft.vz);
    expect(shotErrorRad(1, 0)).toBeGreaterThan(shotErrorRad(0.2, 0));
  });

  it('공격 방향 골문을 향한다', () => {
    const b = createBall(0, 0);
    executeShot(b, createPlayer(0, 0), shot(0.5), -1, geo, new Rng(3));
    expect(b.vx).toBeLessThan(0);
  });
});

/** 페널티 스폿에서 선수 바로 앞 공을 차고 결과 이벤트 종류를 돌려준다 */
function penalty(seed: number, power: number): string | undefined {
  const sim = new Simulation(DT, seed);
  const p = sim.curr.players[0];
  if (!p) throw new Error('no player');
  p.x = geo.penaltySpotX - 0.5;
  sim.curr.ball.x = geo.penaltySpotX;
  const intent = createIntent();
  intent.kick = shot(power);
  sim.step([intent]);
  intent.kick = null;
  for (let i = 0; i < 120; i++) sim.step([intent]);
  return sim.drainEvents().find((e) => e.type === 'goal' || e.type === 'out')?.type;
}

describe('슛 (Simulation)', () => {
  it('페널티 스폿에서 중간 세기 슛은 골이 된다 (여러 시드)', () => {
    for (let seed = 1; seed <= 10; seed++) expect(penalty(seed, 0.6)).toBe('goal');
  });

  it('킥 이벤트를 내고 lastTouch를 기록한다', () => {
    const sim = new Simulation(DT, 1);
    const p = sim.curr.players[0];
    if (!p) throw new Error('no player');
    p.x = -0.5;
    const intent = createIntent();
    intent.kick = shot(0.5);
    sim.step([intent]);
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({ type: 'kick', playerId: 0, kind: 'shot' }),
    );
    expect(sim.curr.ball.lastTouchPlayer).toBe(0);
  });

  it('공을 컨트롤할 수 없으면 킥은 무시된다', () => {
    const sim = new Simulation(DT, 1);
    const intent = createIntent();
    intent.kick = shot(1);
    const p = sim.curr.players[0];
    if (p) p.x = -5;
    sim.step([intent]);
    expect(sim.curr.ball.vx).toBe(0);
  });

  it('같은 시드면 같은 슛 결과 (결정성)', () => {
    const run = (): number => {
      const sim = new Simulation(DT, 42);
      const p = sim.curr.players[0];
      if (p) p.x = -0.5;
      const intent = createIntent();
      intent.kick = shot(0.9);
      sim.step([intent]);
      return sim.curr.ball.vy;
    };
    expect(run()).toBe(run());
  });
});

describe('킥 입력 버퍼 (DESIGN.md §5)', () => {
  function setup(): { sim: Simulation; intent: ReturnType<typeof createIntent> } {
    const sim = new Simulation(DT, 1);
    const p = sim.curr.players[0];
    if (p) p.x = -2;
    return { sim, intent: createIntent() };
  }

  it('컨트롤할 수 없을 때 누른 킥은 0.15초 안에 공이 오면 실행된다', () => {
    const { sim, intent } = setup();
    // 공이 1.5m 떨어져 있을 때 킥 → 공이 6 m/s로 다가와 약 0.12초 뒤 컨트롤 범위(0.8m)에 들어온다
    sim.curr.ball.x = -0.5;
    sim.curr.ball.vx = -6;
    intent.kick = shot(0.5);
    sim.step([intent]);
    intent.kick = null;
    for (let i = 0; i < 8; i++) sim.step([intent]);
    expect(sim.drainEvents().some((e) => e.type === 'kick')).toBe(true);
  });

  it('0.15초가 지나면 버퍼의 킥은 사라진다', () => {
    const { sim, intent } = setup();
    sim.curr.ball.x = 10;
    intent.kick = shot(0.5);
    sim.step([intent]);
    intent.kick = null;
    for (let i = 0; i < 12; i++) sim.step([intent]);
    expect(sim.curr.players[0]?.kickBuffer).toBe(0);
    // 이제 공을 가까이 가져와도 킥하지 않는다
    sim.curr.ball.x = -1.5;
    sim.step([intent]);
    expect(sim.drainEvents().some((e) => e.type === 'kick')).toBe(false);
  });
});
