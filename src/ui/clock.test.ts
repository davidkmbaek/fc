import { describe, expect, it } from 'vitest';
import { MATCH } from '../config';
import { createMatch } from '../sim/state';
import { formatMatchClock, phaseLabel } from './clock';

describe('formatMatchClock', () => {
  it('실제 반 길이를 45분으로 환산한다', () => {
    expect(formatMatchClock(0, 1)).toBe('00:00');
    expect(formatMatchClock(MATCH.HALF_SECONDS / 2, 1)).toBe('22:30');
    expect(formatMatchClock(MATCH.HALF_SECONDS, 1)).toBe('45:00');
  });

  it('후반은 45:00부터 90:00까지', () => {
    expect(formatMatchClock(0, 2)).toBe('45:00');
    expect(formatMatchClock(MATCH.HALF_SECONDS, 2)).toBe('90:00');
  });

  it('범위를 넘지 않는다', () => {
    expect(formatMatchClock(MATCH.HALF_SECONDS * 2, 1)).toBe('45:00');
    expect(formatMatchClock(-5, 1)).toBe('00:00');
  });
});

describe('phaseLabel', () => {
  it('단계별 문구', () => {
    const m = createMatch(true);
    expect(phaseLabel(m)).toBe('경기 전');
    m.phase = 'inPlay';
    expect(phaseLabel(m)).toBe('전반');
    m.half = 2;
    expect(phaseLabel(m)).toBe('후반');
    m.phase = 'fullTime';
    expect(phaseLabel(m)).toBe('종료');
  });
});
