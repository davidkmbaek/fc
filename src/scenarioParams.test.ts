import { describe, expect, it } from 'vitest';
import { SIM } from './config';
import { parseScenarioParams } from './scenarioParams';

describe('parseScenarioParams', () => {
  it('값이 없으면 team(5:5)과 기본 시드', () => {
    expect(parseScenarioParams('')).toEqual({
      scenario: 'team',
      seed: SIM.DEFAULT_SEED,
      difficulty: 'normal',
      warnings: [],
    });
  });

  it('scenario와 seed를 읽는다', () => {
    expect(parseScenarioParams('?scenario=penalty&seed=123')).toMatchObject({
      scenario: 'penalty',
      seed: 123,
      warnings: [],
    });
  });

  it('모르는 시나리오·잘못된 시드는 기본값으로 바꾸고 경고한다', () => {
    const p = parseScenarioParams('?scenario=moon&seed=abc');
    expect(p.scenario).toBe('team');
    expect(p.seed).toBe(SIM.DEFAULT_SEED);
    expect(p.warnings).toHaveLength(2);
  });

  it('difficulty를 읽고, 잘못된 값은 normal', () => {
    expect(parseScenarioParams('?difficulty=hard').difficulty).toBe('hard');
    expect(parseScenarioParams('?difficulty=toString').difficulty).toBe('normal');
    const p = parseScenarioParams('?difficulty=god');
    expect(p.difficulty).toBe('normal');
    expect(p.warnings).toHaveLength(1);
  });

  it('음수·소수 시드는 잘못된 값', () => {
    expect(parseScenarioParams('?seed=-1').warnings).toHaveLength(1);
    expect(parseScenarioParams('?seed=1.5').warnings).toHaveLength(1);
  });
});
