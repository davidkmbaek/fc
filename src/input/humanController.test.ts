import { describe, expect, it } from 'vitest';
import { KEYS } from '../config';
import { createIntent } from '../sim/intent';
import { HumanController } from './humanController';
import type { KeyReader } from './keyboard';

class FakeKeys implements KeyReader {
  readonly pressed = new Set<string>();
  isDown(code: string): boolean {
    return this.pressed.has(code);
  }
}

describe('HumanController — 이동', () => {
  it('방향키 → 이동 방향 (화면 아래가 +y)', () => {
    const keys = new FakeKeys();
    const c = new HumanController(keys);
    const intent = createIntent();
    keys.pressed.add(KEYS.DOWN);
    c.sample(intent);
    expect([intent.moveX, intent.moveY]).toEqual([0, 1]);
  });

  it('대각선은 크기 1로 정규화', () => {
    const keys = new FakeKeys();
    const c = new HumanController(keys);
    const intent = createIntent();
    keys.pressed.add(KEYS.RIGHT);
    keys.pressed.add(KEYS.UP);
    c.sample(intent);
    expect(Math.hypot(intent.moveX, intent.moveY)).toBeCloseTo(1);
    expect(intent.moveX).toBeGreaterThan(0);
    expect(intent.moveY).toBeLessThan(0);
  });

  it('반대 방향을 동시에 누르면 상쇄, E는 스프린트', () => {
    const keys = new FakeKeys();
    const c = new HumanController(keys);
    const intent = createIntent();
    keys.pressed.add(KEYS.LEFT);
    keys.pressed.add(KEYS.RIGHT);
    keys.pressed.add(KEYS.SPRINT);
    c.sample(intent);
    expect(intent.moveX).toBe(0);
    expect(intent.sprint).toBe(true);
  });
});
