import { describe, expect, it } from 'vitest';
import { DIFFICULTY, MATCH } from '../config';
import { MatchAi } from './ai/matchAi';
import { runHeadlessMatch } from './headless';
import { createIntent, type KickIntent, type PlayerIntent } from './intent';
import type { PlayerState } from './player';
import { TEAM_AWAY, TEAM_HOME } from './rules';
import { Simulation } from './Simulation';

const DT = 1 / 60;
/** 정식 경기 한 판(약 370초 시뮬레이션)은 무거워서 기본 5초 제한보다 넉넉히 */
const FULL_MATCH_TIMEOUT_MS = 20_000;

function setup(): { sim: Simulation; intents: PlayerIntent[] } {
  const sim = new Simulation(DT, 1, 'match');
  return { sim, intents: sim.curr.players.map(() => createIntent()) };
}

function run(sim: Simulation, intents: PlayerIntent[], seconds: number): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) sim.step(intents);
}

/** 세트피스 준비가 끝날 때까지 */
function untilReady(sim: Simulation, intents: PlayerIntent[]): void {
  for (let i = 0; i < 600 && !(sim.curr.match.phase === 'setPiece' && sim.curr.match.ready); i++) {
    sim.step(intents);
  }
}

/** 키커가 k를 찬다 */
function take(sim: Simulation, intents: PlayerIntent[], k: KickIntent): void {
  const i = intents[sim.curr.match.takerId] as PlayerIntent;
  i.kick = k;
  sim.step(intents);
  i.kick = null;
}

/** 킥오프를 하고 InPlay에서 공을 (x, y)에서 (vx, vy)로 굴린다. lastTouch = toucher */
function playBall(
  sim: Simulation,
  intents: PlayerIntent[],
  x: number,
  y: number,
  vx: number,
  vy: number,
  toucher: number,
): void {
  untilReady(sim, intents);
  take(sim, intents, { type: 'pass', power: 0.3, aimX: -1, aimY: 0 });
  const b = sim.curr.ball;
  const p = sim.curr.players[toucher] as PlayerState;
  b.x = x;
  b.y = y;
  b.vx = vx;
  b.vy = vy;
  b.passTarget = -1;
  b.lastTouchPlayer = toucher;
  b.lastTouchTeam = p.team;
  b.lastTouchTime = sim.curr.time;
}

describe('경기 시작과 킥오프', () => {
  it('PreMatch → PRE_MATCH초 뒤 홈 공격수의 킥오프, 키커가 차기 전에는 아무도 공을 못 건드린다', () => {
    const { sim, intents } = setup();
    expect(sim.curr.match.phase).toBe('preMatch');
    run(sim, intents, MATCH.PRE_MATCH + 0.1);
    const m = sim.curr.match;
    expect(m).toMatchObject({ phase: 'setPiece', restartKind: 'kickOff', restartTeam: TEAM_HOME });
    expect(sim.curr.players[m.takerId]?.role).toBe('FW');
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({ type: 'whistle', kind: 'kickOff' }),
    );
    // 키커 아닌 선수가 공 쪽으로 달려가도 멈춰 있고 공은 그대로
    (intents[9] as PlayerIntent).moveX = -1;
    run(sim, intents, 1);
    expect(sim.curr.ball).toMatchObject({ x: 0, y: 0, vx: 0 });
    (intents[9] as PlayerIntent).moveX = 0;
  });

  it('키커가 차면 InPlay가 되고 시계가 흐른다', () => {
    const { sim, intents } = setup();
    untilReady(sim, intents);
    take(sim, intents, { type: 'pass', power: 0.3, aimX: -1, aimY: 0 });
    expect(sim.curr.match.phase).toBe('inPlay');
    run(sim, intents, 1);
    expect(sim.curr.match.clock).toBeCloseTo(1, 1);
  });
});

describe('골', () => {
  it('골 → 점수 +1, 세리머니 뒤 실점 팀 킥오프', () => {
    const { sim, intents } = setup();
    playBall(sim, intents, 50, 2.8, 20, 0, 4); // 골키퍼 손이 닿지 않는 쪽
    run(sim, intents, 0.5);
    expect(sim.curr.match).toMatchObject({ phase: 'goalScored', scoreHome: 1, scoreAway: 0 });
    run(sim, intents, MATCH.GOAL_CELEBRATION);
    const m = sim.curr.match;
    expect(m).toMatchObject({ phase: 'setPiece', restartKind: 'kickOff', restartTeam: TEAM_AWAY });
    expect(sim.curr.ball).toMatchObject({ x: 0, y: 0 });
  });
});

describe('세트피스', () => {
  it('터치라인: 상대 팀 스로인 (나간 지점, 상대는 3m 밖), 던지기는 25m 이내', () => {
    const { sim, intents } = setup();
    playBall(sim, intents, 10, 30, 0, 12, 4); // 홈이 마지막 터치 → 원정 스로인
    run(sim, intents, 0.6);
    expect(sim.curr.match.phase).toBe('outOfPlay');
    run(sim, intents, MATCH.OUT_PAUSE + 0.05);
    const m = sim.curr.match;
    expect(m).toMatchObject({ phase: 'setPiece', restartKind: 'throwIn', restartTeam: TEAM_AWAY });
    expect(m.restartY).toBeCloseTo(sim.geo.halfWidth);
    untilReady(sim, intents);
    for (const p of sim.curr.players.filter((q) => q.team === TEAM_HOME)) {
      expect(Math.hypot(p.x - m.restartX, p.y - m.restartY)).toBeGreaterThanOrEqual(
        MATCH.THROW_MIN_DIST - 0.01,
      );
    }
    // 슛 버튼도 던지기(로빙)로, 25m 이내
    const startX = sim.curr.ball.x;
    const startY = sim.curr.ball.y;
    take(sim, intents, { type: 'shot', power: 1, aimX: 0, aimY: -1 });
    expect(sim.curr.match.phase).toBe('inPlay');
    const kicks = sim.drainEvents().filter((e) => e.type === 'kick');
    expect(kicks.at(-1)).toMatchObject({ kind: 'lob' });
    // 처음 떨어지는 지점: 최고점을 지나 낮아진 첫 스텝 (서브스텝 때문에 z가 정확히 0인 스텝은 드물다)
    let falling = false;
    for (let i = 0; i < 240; i++) {
      sim.step(intents);
      const b = sim.curr.ball;
      if (b.vz < 0) falling = true;
      if (falling && b.z < 0.3) break;
    }
    const d = Math.hypot(sim.curr.ball.x - startX, sim.curr.ball.y - startY);
    expect(d).toBeLessThan(MATCH.THROW_MAX_DIST + 3);
  });

  it('골라인 + 수비팀 마지막 터치: 공격팀 코너킥 (상대는 9.15m 밖)', () => {
    const { sim, intents } = setup();
    playBall(sim, intents, 48, 15, 15, 0, 7); // 원정(수비)이 +x 골라인 밖으로 → 홈 코너킥
    run(sim, intents, 1 + MATCH.OUT_PAUSE);
    const m = sim.curr.match;
    expect(m).toMatchObject({ restartKind: 'cornerKick', restartTeam: TEAM_HOME });
    expect(Math.abs(m.restartX)).toBeGreaterThan(sim.geo.halfLength - 1);
    expect(Math.abs(m.restartY)).toBeGreaterThan(sim.geo.halfWidth - 1);
    untilReady(sim, intents);
    for (const p of sim.curr.players.filter((q) => q.team === TEAM_AWAY)) {
      expect(Math.hypot(p.x - m.restartX, p.y - m.restartY)).toBeGreaterThanOrEqual(
        MATCH.OPP_MIN_DIST - 0.01,
      );
    }
    const taker = sim.curr.players[m.takerId] as PlayerState;
    expect(taker.team).toBe(TEAM_HOME);
    expect(Math.hypot(taker.x - m.restartX, taker.y - m.restartY)).toBeCloseTo(MATCH.TAKER_GAP);
  });

  it('골라인 + 공격팀 마지막 터치: 수비팀 골킥 (골키퍼, 골 에어리어 앞)', () => {
    const { sim, intents } = setup();
    playBall(sim, intents, 48, 15, 15, 0, 4); // 홈(공격)이 +x 골라인 밖으로 → 원정 골킥
    run(sim, intents, 1 + MATCH.OUT_PAUSE);
    const m = sim.curr.match;
    expect(m).toMatchObject({ restartKind: 'goalKick', restartTeam: TEAM_AWAY });
    expect(m.restartX).toBeCloseTo(sim.geo.goalAreaX);
    expect(sim.curr.players[m.takerId]?.role).toBe('GK');
  });
});

describe('전·후반', () => {
  it('반 시간이 끝나면 하프타임 → 진영 교체, 원정 킥오프 → 후반 끝나면 종료', () => {
    const { sim, intents } = setup();
    untilReady(sim, intents);
    take(sim, intents, { type: 'pass', power: 0.3, aimX: -1, aimY: 0 });
    sim.curr.match.clock = MATCH.HALF_SECONDS - 0.05;
    run(sim, intents, 0.1);
    expect(sim.curr.match.phase).toBe('halfTime');
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({ type: 'whistle', kind: 'halfTime' }),
    );
    run(sim, intents, MATCH.HALF_TIME_PAUSE + 0.05);
    const m = sim.curr.match;
    expect(m).toMatchObject({ half: 2, clock: 0, phase: 'setPiece', restartTeam: TEAM_AWAY });
    expect(sim.curr.homeAttackDir).toBe(-1);
    // 후반: 원정이 +x로 공격 → 원정 공격수는 -x 쪽(자기 진영)이 아닌 공 옆
    untilReady(sim, intents);
    take(sim, intents, { type: 'pass', power: 0.3, aimX: 1, aimY: 0 });
    sim.curr.match.clock = MATCH.HALF_SECONDS - 0.05;
    run(sim, intents, 0.1);
    expect(sim.curr.match.phase).toBe('fullTime');
  });
});

describe('AI 대 AI 정식 경기 (4단계 완료 조건)', () => {
  it(
    '손대지 않아도 킥오프부터 종료 휘슬까지 오류·정체 없이 끝난다',
    () => {
      const r = runHeadlessMatch(3);
      expect(r.errors).toEqual([]);
      expect(r.finished).toBe(true);
      expect(r.restarts.kickOff).toBeGreaterThanOrEqual(2); // 전반 + 후반
    },
    FULL_MATCH_TIMEOUT_MS,
  );
});

describe('사람 키커가 차지 않을 때', () => {
  it('HUMAN_TAKE_TIMEOUT 뒤 AI가 대신 찬다', () => {
    const { sim, intents } = setup();
    const ai = new MatchAi(DT, 1, sim.geo, [DIFFICULTY.normal, DIFFICULTY.normal]);
    untilReady(sim, intents);
    const human = sim.curr.match.takerId; // 사람이 조종한다고 가정 (AI 제외)
    const tick = (): void => {
      ai.update(sim.curr, intents, human);
      sim.step(intents);
    };
    for (let i = 0; i < Math.round((MATCH.HUMAN_TAKE_TIMEOUT - 1) / DT); i++) tick();
    expect(sim.curr.match.phase).toBe('setPiece');
    for (let i = 0; i < Math.round(2 / DT); i++) tick();
    expect(sim.curr.match.phase).toBe('inPlay');
  });
});
