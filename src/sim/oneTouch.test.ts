import { describe, expect, it } from 'vitest';
import { DRIBBLE, KEYS } from '../config';
import { HumanSide } from '../input/humanSide';
import { createIntent, type KickIntent, type PlayerIntent } from './intent';
import { createPlayer, type PlayerState } from './player';
import { Simulation } from './Simulation';

const DT = 1 / 60;
const pass = (aimX: number, aimY: number): KickIntent => ({ type: 'pass', power: 0.5, aimX, aimY });

/** 0(공 뒤) → 1(15, 0) → 2(15, 15) 세 명의 홈 선수 */
function setup(): { sim: Simulation; intents: PlayerIntent[] } {
  const sim = new Simulation(DT, 3, 'freeplay');
  for (const st of [sim.curr, sim.prev]) {
    st.players.push(createPlayer(1, 0, 15, 0), createPlayer(2, 0, 15, 15));
  }
  (sim.curr.players[0] as PlayerState).x = -0.5;
  return { sim, intents: sim.curr.players.map(() => createIntent()) };
}

describe('원터치 패스 (DESIGN.md §5 입력 버퍼)', () => {
  it('패스가 오는 동안 받을 선수가 킥을 누르면, 공을 멈추지 않고 바로 다음 동료에게 보낸다', () => {
    const { sim, intents } = setup();
    const i0 = intents[0] as PlayerIntent;
    const i1 = intents[1] as PlayerIntent;
    i0.kick = pass(1, 0);
    sim.step(intents);
    i0.kick = null;
    // 공이 날아가는 중간(0.5초 뒤)에 1번이 2번(위쪽) 방향으로 킥
    for (let i = 0; i < 30; i++) sim.step(intents);
    i1.kick = pass(0, 1);
    sim.step(intents);
    i1.kick = null;

    let minSpeedAtOne = Infinity;
    for (let i = 0; i < 180; i++) {
      sim.step(intents);
      const b = sim.curr.ball;
      if (b.lastTouchPlayer === 1) minSpeedAtOne = Math.min(minSpeedAtOne, Math.hypot(b.vx, b.vy));
    }
    const kicks = sim.drainEvents().filter((e) => e.type === 'kick');
    expect(kicks.map((k) => k.type === 'kick' && [k.playerId, k.targetId])).toEqual([
      [0, 1],
      [1, 2],
    ]);
    // 1번이 공을 멈춰 세운 적이 없다 (트래핑 없이 바로 찼다)
    expect(minSpeedAtOne).toBeGreaterThan(3);
    expect(sim.curr.ball.lastTouchPlayer).toBe(2);
  });

  it('패스를 받을 선수가 아니면 DESIGN대로 KICK_BUFFER 후 사라진다', () => {
    const { sim, intents } = setup();
    const i2 = intents[2] as PlayerIntent;
    i2.kick = pass(1, 0);
    sim.step(intents);
    i2.kick = null;
    for (let i = 0; i < Math.ceil(DRIBBLE.KICK_BUFFER / DT) + 1; i++) sim.step(intents);
    expect(sim.curr.players[2]?.kickBuffer).toBe(0);
  });
});

describe('원터치 패스 — 사람 입력 흐름', () => {
  it('패스 → 받을 동료로 자동 전환 → 공이 오는 중 S를 톡 → 원터치로 연결', () => {
    const { sim, intents } = setup();
    const pressed = new Set<string>();
    const human = new HumanSide({ isDown: (c) => pressed.has(c) }, DT, 0, 0, sim.curr);
    const tick = (): void => {
      human.beforeStep(intents, sim.curr);
      sim.step(intents);
      human.afterStep(intents, sim.curr);
    };
    // 오른쪽을 보며 S를 짧게 → 1번에게 패스
    pressed.add(KEYS.PASS);
    for (let i = 0; i < 6; i++) tick();
    pressed.delete(KEYS.PASS);
    tick();
    expect(human.controlledId).toBe(1);
    // 0.4초 뒤 아래(+y) 방향키 + S 톡
    for (let i = 0; i < 24; i++) tick();
    pressed.add(KEYS.DOWN);
    pressed.add(KEYS.PASS);
    for (let i = 0; i < 4; i++) tick();
    pressed.delete(KEYS.PASS);
    tick();
    pressed.delete(KEYS.DOWN);
    for (let i = 0; i < 180; i++) tick();
    const kicks = sim.drainEvents().filter((e) => e.type === 'kick');
    expect(kicks).toHaveLength(2);
    expect(kicks[1]).toMatchObject({ playerId: 1, targetId: 2 });
    expect(human.controlledId).toBe(2);
  });
});
