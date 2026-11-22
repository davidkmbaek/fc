import { SIM } from './config';
import { isScenarioId, type ScenarioId } from './sim/scenarios';

/** URL에 시나리오가 없을 때 (2단계부터 5:5) */
export const DEFAULT_SCENARIO: ScenarioId = 'team';

export interface ScenarioParams {
  scenario: ScenarioId;
  seed: number;
  /** 잘못된 값이 있었다면 그 설명 (콘솔 경고용) */
  warnings: string[];
}

/**
 * URL 쿼리 `?scenario=team|freeplay|penalty&seed=123`을 읽는다. DESIGN.md §9
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

  return { scenario, seed, warnings };
}
