import { describe, expect, it } from 'vitest';
import { BALL, DRIBBLE, PASS } from '../config';
import { createIntent, type KickIntent, type KickType, type PlayerIntent } from './intent';
import { rollDistance } from './math/rolling';
import { arriveSpeed, laneSafety, selectPassTarget } from './passing';
import { createPlayer, type PlayerState } from './player';
import { Simulation } from './Simulation';

const DT = 1 / 60;
const kick = (type: KickType, power = 0.5, aimX = 0, aimY = 0): KickIntent => ({
  type,
  power,
  aimX,
  aimY,
});

/** freeplay(선수 0 + 센터의 공)에 선수를 더하고, 선수 0을 공 바로 뒤에 둔다 */
function setup(
  seed: number,
  extra: readonly { team: number; x: number; y: number }[],
): { sim: Simulation; intents: PlayerIntent[] } {
  const sim = new Simulation(DT, seed, 'freeplay');
  for (const st of [sim.curr, sim.prev]) {
    extra.forEach((e, i) => st.players.push(createPlayer(i + 1, e.team, e.x, e.y)));
  }
  const p0 = sim.curr.players[0] as PlayerState;
  p0.x = -0.5;
  return { sim, intents: sim.curr.players.map(() => createIntent()) };
}

/** 선수 0이 k를 차고 아무 입력 없이 seconds초 진행 */
function kickAndRun(sim: Simulation, intents: PlayerIntent[], k: KickIntent, seconds: number) {
  const i0 = intents[0] as PlayerIntent;
  i0.kick = k;
  sim.step(intents);
  i0.kick = null;
  for (let i = 0; i < Math.round(seconds / DT); i++) sim.step(intents);
  return sim.drainEvents();
}

describe('laneSafety', () => {
  it('경로에서 멀면 1, 경로 위에 있으면 0', () => {
    expect(laneSafety(0, 0, 20, 0, [createPlayer(9, 1, 10, 10)])).toBe(1);
    expect(laneSafety(0, 0, 20, 0, [createPlayer(9, 1, 10, 0)])).toBe(0);
    const half = laneSafety(0, 0, 20, 0, [createPlayer(9, 1, 10, PASS.LANE_SAFE_DIST / 2)]);
    expect(half).toBeCloseTo(0.5);
  });

  it('경로 끝 너머의 상대는 끝점까지 거리로 본다', () => {
    expect(laneSafety(0, 0, 10, 0, [createPlayer(9, 1, 30, 0)])).toBe(1);
  });
});

describe('selectPassTarget', () => {
  const passer = createPlayer(0, 0, 0, 0);

  it('조준 방향 ±35° 안의 동료만 후보', () => {
    const players = [passer, createPlayer(1, 0, 15, 0), createPlayer(2, 0, 0, 15)];
    expect(selectPassTarget(passer, 1, 0, 'pass', players)).toBe(1);
    expect(selectPassTarget(passer, 0, 1, 'pass', players)).toBe(2);
    expect(selectPassTarget(passer, -1, 0, 'pass', players)).toBe(-1);
  });

  it('경로가 막힌 동료보다 열린 동료를 고른다', () => {
    const players = [
      passer,
      createPlayer(1, 0, 15, 0),
      createPlayer(2, 0, 15, 5),
      createPlayer(9, 1, 7, 0), // 1번으로 가는 길을 막음
    ];
    expect(selectPassTarget(passer, 1, 0, 'pass', players)).toBe(2);
  });

  it('너무 가깝거나 먼 동료, 상대 선수는 후보가 아니다', () => {
    const players = [
      passer,
      createPlayer(1, 0, 1, 0),
      createPlayer(2, 0, 60, 0),
      createPlayer(9, 1, 15, 0),
    ];
    expect(selectPassTarget(passer, 1, 0, 'pass', players)).toBe(-1);
  });
});

describe('패스 실행 (Simulation)', () => {
  it('짧은 패스: 동료에게 도착해 발밑에 멈춘다 (트래핑)', () => {
    const { sim, intents } = setup(1, [{ team: 0, x: 15, y: 3 }]);
    const events = kickAndRun(sim, intents, kick('pass', 0.5, 1, 0.2), 4);
    expect(events.find((e) => e.type === 'kick')).toMatchObject({ kind: 'pass', targetId: 1 });
    const b = sim.curr.ball;
    expect(b.lastTouchPlayer).toBe(1);
    expect(Math.hypot(b.x - 15, b.y - 3)).toBeLessThan(DRIBBLE.CONTROL_RADIUS * 2);
    expect(Math.hypot(b.vx, b.vy)).toBeLessThan(0.5);
  });

  it('짧은 패스는 받는 사람 앞에서 arriveSpeed(power) ±1 m/s', () => {
    const { sim, intents } = setup(1, [{ team: 0, x: 20, y: 0 }]);
    const i0 = intents[0] as PlayerIntent;
    i0.kick = kick('pass', 0.5, 1, 0);
    sim.step(intents);
    i0.kick = null;
    const b = sim.curr.ball;
    while (b.x < 20 - DRIBBLE.CONTROL_RADIUS - 0.2) sim.step(intents);
    expect(Math.abs(Math.hypot(b.vx, b.vy) - arriveSpeed(0.5))).toBeLessThan(1);
  });

  it('로빙 패스: 공이 떠서 동료 근처(±3m)에 처음 떨어진다', () => {
    const { sim, intents } = setup(1, [{ team: 0, x: 25, y: 0 }]);
    const i0 = intents[0] as PlayerIntent;
    i0.kick = kick('lob', 0.5, 1, 0);
    sim.step(intents);
    i0.kick = null;
    let maxZ = 0;
    let landX = NaN;
    for (let i = 0; i < 240 && Number.isNaN(landX); i++) {
      const wasAir = sim.curr.ball.z > 0;
      sim.step(intents);
      maxZ = Math.max(maxZ, sim.curr.ball.z);
      if (wasAir && sim.curr.ball.z === 0) landX = sim.curr.ball.x;
    }
    expect(maxZ).toBeGreaterThan(2);
    expect(Math.abs(landX - 25)).toBeLessThan(3);
  });

  it('스루패스: 동료보다 조준 방향으로 앞선 공간으로 간다', () => {
    const { sim, intents } = setup(1, [{ team: 0, x: 12, y: 0 }]);
    const events = kickAndRun(sim, intents, kick('through', 0.5, 1, 0), 0);
    expect(events.find((e) => e.type === 'kick')).toMatchObject({ kind: 'through', targetId: 1 });
    // 막 찬 공이 멈출 때까지 굴러갈 거리로 도착 지점을 본다
    const b = sim.curr.ball;
    const stopX = b.x + rollDistance(b.vx, 0, BALL.ROLL_DECEL, BALL.ROLL_DAMPING);
    expect(stopX).toBeGreaterThan(14);
  });

  it('후보가 없으면 조준 방향으로 찬다', () => {
    const { sim, intents } = setup(1, [{ team: 0, x: -15, y: 0 }]);
    const events = kickAndRun(sim, intents, kick('pass', 0.5, 0, 1), 0);
    expect(events.find((e) => e.type === 'kick')).toMatchObject({ targetId: -1 });
    expect(sim.curr.ball.vy).toBeGreaterThan(0);
  });

  it('가만히 서 있는 상대가 경로 위에 있으면 패스가 끊긴다', () => {
    const { sim, intents } = setup(1, [
      { team: 0, x: 20, y: 0 },
      { team: 1, x: 10, y: 0.3 },
    ]);
    kickAndRun(sim, intents, kick('pass', 0.2, 1, 0), 4);
    expect(sim.curr.ball.lastTouchTeam).toBe(1);
  });
});

describe('패스 5번 연결 (2단계 완료 조건)', () => {
  it('서 있는 동료들끼리 받고 → 다음 동료에게 패스를 5번 연결한다', () => {
    const spots = [
      { team: 0, x: 10, y: 8 },
      { team: 0, x: 22, y: -2 },
      { team: 0, x: 12, y: -14 },
      { team: 0, x: 0, y: -6 },
      { team: 0, x: 14, y: 6 },
    ];
    const { sim, intents } = setup(7, spots);
    let passes = 0;
    let holder = 0;
    for (let i = 0; i < 60 * 30 && passes < 5; i++) {
      for (const it of intents) it.kick = null;
      const b = sim.curr.ball;
      const h = sim.curr.players[holder] as PlayerState;
      const settled = Math.hypot(b.vx, b.vy) < 1 && Math.hypot(b.x - h.x, b.y - h.y) < 1;
      // 공을 받아 멈췄으면 다음 동료 쪽을 조준해 패스
      if (settled && (holder === 0 || b.lastTouchPlayer === holder)) {
        const target = sim.curr.players[passes + 1] as PlayerState;
        (intents[holder] as PlayerIntent).kick = kick('pass', 0.5, target.x - h.x, target.y - h.y);
        holder = passes + 1;
        passes++;
      }
      sim.step(intents);
    }
    const kicks = sim.drainEvents().filter((e) => e.type === 'kick');
    expect(kicks).toHaveLength(5);
    kicks.forEach((k, i) => expect(k).toMatchObject({ kind: 'pass', targetId: i + 1 }));
    for (let i = 0; i < 240; i++) sim.step(intents);
    expect(sim.curr.ball.lastTouchPlayer).toBe(5);
  });
});

describe('뒤로 하는 패스', () => {
  it('공과 받는 사람 사이에 선 패서의 몸에 공이 맞지 않는다', () => {
    const { sim, intents } = setup(1, [{ team: 0, x: -18, y: 0 }]);
    const p0 = sim.curr.players[0] as PlayerState;
    p0.x = -0.7;
    p0.facing = Math.PI;
    const events = kickAndRun(sim, intents, kick('pass', 0.3, -1, 0), 4);
    expect(events.find((e) => e.type === 'kick')).toMatchObject({ targetId: 1 });
    expect(sim.curr.ball.lastTouchPlayer).toBe(1);
  });
});
