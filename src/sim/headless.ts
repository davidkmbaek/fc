import { HEADLESS, SIM } from '../config';
import { MatchAi } from './ai/matchAi';
import { createIntent } from './intent';
import { Simulation } from './Simulation';

export interface MatchStats {
  seed: number;
  seconds: number;
  goals: [number, number];
  shots: [number, number];
  passes: [number, number];
  tackles: number;
  outs: number;
  /** 팀별 볼 소유(마지막 터치) 시간 비율 */
  possession: [number, number];
  /** 아무도 공을 건드리지 않은 가장 긴 시간 (초, 골·아웃 재배치 대기 제외) */
  longestIdle: number;
  /** NaN·월드 밖 공·정체 등 오류 설명 */
  errors: string[];
}

/**
 * AI 대 AI 경기를 브라우저 없이 돌린다. DESIGN.md §9 헤드리스 시뮬레이션, §10 시뮬레이션 테스트
 * 경기 상태 머신(4.1) 전이라 골·아웃 뒤에는 시나리오대로 킥오프 자리에서 다시 시작한다.
 */
export function runHeadlessMatch(seed: number, seconds: number): MatchStats {
  const sim = new Simulation(SIM.DT, seed, 'team');
  const ai = new MatchAi(SIM.DT, seed, sim.geo);
  const intents = sim.curr.players.map(() => createIntent());
  const st: MatchStats = {
    seed,
    seconds,
    goals: [0, 0],
    shots: [0, 0],
    passes: [0, 0],
    tackles: 0,
    outs: 0,
    possession: [0, 0],
    longestIdle: 0,
    errors: [],
  };
  const owned = [0, 0];
  let idleSince = 0;
  const steps = Math.round(seconds / SIM.DT);

  for (let i = 0; i < steps; i++) {
    ai.update(sim.curr, intents, -1);
    sim.step(intents);
    const s = sim.curr;
    const b = s.ball;

    for (const e of sim.drainEvents()) {
      const team = (id: number): number => s.players[id]?.team ?? 0;
      if (e.type === 'goal') st.goals[e.team as 0 | 1]++;
      else if (e.type === 'out') st.outs++;
      else if (e.type === 'tackle') st.tackles++;
      else if (e.type === 'kick') {
        const t = team(e.playerId) as 0 | 1;
        if (e.kind === 'shot') st.shots[t]++;
        else st.passes[t]++;
      }
    }

    if (b.lastTouchTeam === 0 || b.lastTouchTeam === 1)
      owned[b.lastTouchTeam] = (owned[b.lastTouchTeam] ?? 0) + 1;
    if (s.ballResetTick >= 0 || b.lastTouchTime > idleSince)
      idleSince = Math.max(b.lastTouchTime, s.time);
    st.longestIdle = Math.max(st.longestIdle, s.time - idleSince);

    if (!Number.isFinite(b.x + b.y + b.z + b.vx + b.vy + b.vz))
      st.errors.push(`NaN ball @${s.time.toFixed(2)}`);
    if (Math.abs(b.x) > sim.geo.worldHalfLength || Math.abs(b.y) > sim.geo.worldHalfWidth) {
      st.errors.push(`ball outside world @${s.time.toFixed(2)}`);
    }
    for (const p of s.players) {
      if (!Number.isFinite(p.x + p.y + p.vx + p.vy))
        st.errors.push(`NaN player ${p.id} @${s.time.toFixed(2)}`);
    }
    if (st.errors.length > 0) break;
  }
  if (st.longestIdle > HEADLESS.STALL_SECONDS)
    st.errors.push(`stall ${st.longestIdle.toFixed(1)}s`);
  const total = (owned[0] ?? 0) + (owned[1] ?? 0) || 1;
  st.possession = [(owned[0] ?? 0) / total, (owned[1] ?? 0) / total];
  return st;
}
