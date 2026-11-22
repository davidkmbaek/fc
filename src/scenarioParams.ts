import { DIFFICULTY, type Difficulty, SIM } from './config';
import { isScenarioId, type ScenarioId } from './sim/scenarios';

function isDifficulty(v: string): v is Difficulty {
  return Object.hasOwn(DIFFICULTY, v);
}

/** URL에 시나리오가 없을 때 (4단계부터 정식 경기) */
export const DEFAULT_SCENARIO: ScenarioId = 'match';

export interface ScenarioParams {
  scenario: ScenarioId;
  seed: number;
  /** 상대 팀 AI 난이도 (우리 팀 AI 동료는 항상 normal) */
  difficulty: Difficulty;
  /** 잘못된 값이 있었다면 그 설명 (콘솔 경고용) */
  warnings: string[];
}

/**
 * URL 쿼리 `?scenario=match|team|freeplay|penalty|tackle&seed=123&difficulty=easy|normal|hard`를 읽는다. DESIGN.md §9
 * 모르는 시나리오·잘못된 시드는 기본값(DEFAULT_SCENARIO, SIM.DEFAULT_SEED)으로 바꾸고 경고를 남긴다.
 */
export function parseScenarioParams(search: string): ScenarioParams {
  const q = new URLSearchParams(search);
  const warnings: string[] = [];

  let scenario: ScenarioId = DEFAULT_SCENARIO;
  const rawScenario = q.get('scenario');
  if (rawScenario !== null) {
    if (isScenarioId(rawScenario)) scenario = rawScenario;
    else warnings.push(`알 수 없는 scenario "${rawScenario}" → ${DEFAULT_SCENARIO}`);
  }

  let seed: number = SIM.DEFAULT_SEED;
  const rawSeed = q.get('seed');
  if (rawSeed !== null) {
    const n = Number(rawSeed);
    if (Number.isInteger(n) && n >= 0) seed = n;
    else warnings.push(`잘못된 seed "${rawSeed}" → ${SIM.DEFAULT_SEED}`);
  }

  let difficulty: Difficulty = 'normal';
  const rawDiff = q.get('difficulty');
  if (rawDiff !== null) {
    if (isDifficulty(rawDiff)) difficulty = rawDiff;
    else warnings.push(`잘못된 difficulty "${rawDiff}" → normal`);
  }

  return { scenario, seed, difficulty, warnings };
}
