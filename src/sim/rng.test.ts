import { describe, expect, it } from 'vitest';
import { Rng } from './rng';

const sample = (rng: Rng, n: number): number[] => Array.from({ length: n }, () => rng.next());

describe('Rng', () => {
  it('같은 시드는 같은 수열을 만든다', () => {
    expect(sample(new Rng(123), 100)).toEqual(sample(new Rng(123), 100));
  });

  it('다른 시드는 다른 수열을 만든다', () => {
    expect(sample(new Rng(1), 10)).not.toEqual(sample(new Rng(2), 10));
  });

  it('next()는 [0, 1) 범위다', () => {
    const rng = new Rng(42);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(min, max)는 양 끝을 포함하고 범위를 벗어나지 않는다', () => {
    const rng = new Rng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1_000; i++) {
      const v = rng.int(1, 3);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(3);
      seen.add(v);
    }
    expect(seen).toEqual(new Set([1, 2, 3]));
  });

  it('상태를 저장·복원하면 같은 수열이 이어진다', () => {
    const rng = new Rng(99);
    sample(rng, 5);
    const saved = rng.getState();
    const a = sample(rng, 20);
    rng.setState(saved);
    expect(sample(rng, 20)).toEqual(a);
  });
});
