import { DIFFICULTY, type Difficulty, HEADLESS, SIM } from '../config';
import { MatchAi } from './ai/matchAi';
import { createIntent } from './intent';
import { Simulation } from './Simulation';

export interface MatchStats {
  seed: number;
  /** 실제로 진행한 시뮬레이션 시간 (초) */
  seconds: number;
  /** 종료 휘슬까지 갔는가 */
  finished: boolean;
  goals: [number, number];
  shots: [number, number];
  passes: [number, number];
  tackles: number;
  outs: number;
  /** 재시작 종류별 횟수 */
  restarts: { kickOff: number; throwIn: number; cornerKick: number; goalKick: number };
  /** 팀별 볼 소유(마지막 터치) 시간 비율 */
  possession: [number, number];
  /** InPlay 중 아무도 공을 건드리지 않은 가장 긴 시간 (초) */
  longestIdle: number;
  /** InPlay가 아닌 단계(세트피스 등)가 가장 길게 이어진 시간 (초) */
  longestStoppage: number;
  /** NaN·월드 밖 공·정체 등 오류 설명 */
  errors: string[];
}

/**
 * AI 대 AI 정식 경기(match 시나리오)를 브라우저 없이 종료 휘슬까지 돌린다.
 * DESIGN.md §9 헤드리스 시뮬레이션, §10 시뮬레이션 테스트. maxSeconds는 안전 상한.
 */
export function runHeadlessMatch(
  seed: number,
  maxSeconds: number = HEADLESS.MAX_MATCH_SECONDS,
  home: Difficulty = 'normal',
  away: Difficulty = 'normal',
): MatchStats {
  const sim = new Simulation(SIM.DT, seed, 'match');
  const ai = new MatchAi(SIM.DT, seed, sim.geo, [DIFFICULTY[home], DIFFICULTY[away]]);
  const intents = sim.curr.players.map(() => createIntent());
  const st: MatchStats = {
    seed,
    seconds: 0,
    finished: false,
    goals: [0, 0],
    shots: [0, 0],
    passes: [0, 0],
    tackles: 0,
    outs: 0,
    restarts: { kickOff: 0, throwIn: 0, cornerKick: 0, goalKick: 0 },
    possession: [0, 0],
    longestIdle: 0,
    longestStoppage: 0,
    errors: [],
  };
  const owned = [0, 0];
  let idleSince = 0;
  let lastPhase = '';
  let lastPhaseStart = 0;
  const steps = Math.round(maxSeconds / SIM.DT);

  for (let i = 0; i < steps; i++) {
    ai.update(sim.curr, intents, -1);
    sim.step(intents);
    const s = sim.curr;
    const b = s.ball;
    const m = s.match;

    for (const e of sim.drainEvents()) {
      const team = (id: number): 0 | 1 => (s.players[id]?.team === 1 ? 1 : 0);
      if (e.type === 'goal') st.goals[e.team === 1 ? 1 : 0]++;
      else if (e.type === 'out') st.outs++;
      else if (e.type === 'tackle') st.tackles++;
      else if (e.type === 'kick') {
        if (e.kind === 'shot') st.shots[team(e.playerId)]++;
        else st.passes[team(e.playerId)]++;
      }
    }
    if (m.phase !== lastPhase) {
      if (m.phase === 'setPiece') st.restarts[m.restartKind]++;
      lastPhase = m.phase;
      lastPhaseStart = s.time;
    }

    if (b.lastTouchTeam === 0 || b.lastTouchTeam === 1)
      owned[b.lastTouchTeam] = (owned[b.lastTouchTeam] ?? 0) + 1;
    if (m.phase === 'inPlay') {
      if (b.lastTouchTime > idleSince) idleSince = b.lastTouchTime;
      st.longestIdle = Math.max(st.longestIdle, s.time - Math.max(idleSince, lastPhaseStart));
    } else if (m.phase !== 'fullTime') {
      st.longestStoppage = Math.max(st.longestStoppage, s.time - lastPhaseStart);
    }

    if (!Number.isFinite(b.x + b.y + b.z + b.vx + b.vy + b.vz))
      st.errors.push(`NaN ball @${s.time.toFixed(2)}`);
    if (Math.abs(b.x) > sim.geo.worldHalfLength || Math.abs(b.y) > sim.geo.worldHalfWidth) {
      st.errors.push(`ball outside world @${s.time.toFixed(2)}`);
    }
    for (const p of s.players) {
      if (!Number.isFinite(p.x + p.y + p.vx + p.vy))
        st.errors.push(`NaN player ${p.id} @${s.time.toFixed(2)}`);
    }
    st.seconds = s.time;
    if (st.errors.length > 0) break;
    if (m.phase === 'fullTime') {
      st.finished = true;
      break;
    }
  }
  if (st.longestIdle > HEADLESS.STALL_SECONDS)
    st.errors.push(`stall ${st.longestIdle.toFixed(1)}s`);
  if (st.longestStoppage > HEADLESS.STALL_SECONDS) {
    st.errors.push(`stoppage ${st.longestStoppage.toFixed(1)}s`);
  }
  if (!st.finished && st.errors.length === 0) st.errors.push('종료 휘슬 없음');
  // 점수판과 이벤트 집계가 맞는지
  if (st.goals[0] !== sim.curr.match.scoreHome || st.goals[1] !== sim.curr.match.scoreAway) {
    st.errors.push('점수 불일치');
  }
  const total = (owned[0] ?? 0) + (owned[1] ?? 0) || 1;
  st.possession = [(owned[0] ?? 0) / total, (owned[1] ?? 0) / total];
  return st;
}
