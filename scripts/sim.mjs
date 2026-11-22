// 헤드리스 AI 대 AI 시뮬레이션. DESIGN.md §9
// 사용법: npm run sim -- --matches 20 --seed 1 [--seconds 300] [--home normal] [--away hard]
// TypeScript 소스(src/sim)를 Vite의 서버 측 모듈 로더로 그대로 불러온다 (별도 빌드·의존성 없음).
import { createServer } from 'vite';

function parseArgs(argv) {
  const out = { matches: 20, seed: 1, seconds: undefined, home: 'normal', away: 'normal' };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]?.replace(/^--/, '');
    const value = argv[i + 1];
    if (!key || value === undefined || !(key in out)) continue;
    out[key] = ['home', 'away'].includes(key) ? value : Number(value);
    i++;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});

let failed = 0;
try {
  const { runHeadlessMatch } = await server.ssrLoadModule('/src/sim/headless.ts');
  const { HEADLESS } = await server.ssrLoadModule('/src/config.ts');
  const seconds = args.seconds ?? HEADLESS.MAX_MATCH_SECONDS;
  console.log(
    `AI 대 AI ${args.matches}경기 (종료 휘슬까지, 상한 ${seconds}초, 시드 ${args.seed}~, 홈 ${args.home} / 원정 ${args.away})`,
  );
  console.log(
    'seed | 골(홈:원정) | 슛 | 패스 | 태클 | 스로인/코너/골킥 | 점유율(홈) | 최장 정지 | 오류',
  );

  const t0 = performance.now();
  const totals = { goals: 0, shots: 0, passes: 0 };
  for (let m = 0; m < args.matches; m++) {
    const seed = args.seed + m;
    const r = runHeadlessMatch(seed, seconds, args.home, args.away);
    totals.goals += r.goals[0] + r.goals[1];
    totals.shots += r.shots[0] + r.shots[1];
    totals.passes += r.passes[0] + r.passes[1];
    if (r.errors.length > 0) failed++;
    console.log(
      [
        String(seed).padStart(4),
        `${r.goals[0]}:${r.goals[1]}`.padStart(11),
        `${r.shots[0]}:${r.shots[1]}`.padStart(5),
        `${r.passes[0]}:${r.passes[1]}`.padStart(7),
        String(r.tackles).padStart(5),
        `${r.restarts.throwIn}/${r.restarts.cornerKick}/${r.restarts.goalKick}`.padStart(15),
        `${(r.possession[0] * 100).toFixed(0)}%`.padStart(10),
        `${Math.max(r.longestIdle, r.longestStoppage).toFixed(1)}s`.padStart(9),
        r.errors.join(', ') || '-',
      ].join(' | '),
    );
  }
  const n = args.matches || 1;
  console.log(
    `\n평균: 골 ${(totals.goals / n).toFixed(2)}, 슛 ${(totals.shots / n).toFixed(1)}, ` +
      `패스 ${(totals.passes / n).toFixed(0)} / 오류 경기 ${failed} / ` +
      `${((performance.now() - t0) / 1000).toFixed(1)}초`,
  );
} finally {
  await server.close();
}
process.exit(failed > 0 ? 1 : 0);
