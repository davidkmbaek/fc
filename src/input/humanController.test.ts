import { describe, expect, it } from 'vitest';
import { KEYS, SHOT } from '../config';
import { createIntent } from '../sim/intent';
import { HumanController } from './humanController';
import type { KeyReader } from './keyboard';

const DT = 1 / 60;

class FakeKeys implements KeyReader {
  readonly pressed = new Set<string>();
  isDown(code: string): boolean {
    return this.pressed.has(code);
  }
}

describe('HumanController — 이동', () => {
  it('방향키 → 이동 방향 (화면 아래가 +y)', () => {
    const keys = new FakeKeys();
    const c = new HumanController(keys, DT);
    const intent = createIntent();
    keys.pressed.add(KEYS.DOWN);
    c.sample(intent);
    expect([intent.moveX, intent.moveY]).toEqual([0, 1]);
  });

  it('대각선은 크기 1로 정규화', () => {
    const keys = new FakeKeys();
    const c = new HumanController(keys, DT);
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
    const c = new HumanController(keys, DT);
    const intent = createIntent();
    keys.pressed.add(KEYS.LEFT);
    keys.pressed.add(KEYS.RIGHT);
    keys.pressed.add(KEYS.SPRINT);
    c.sample(intent);
    expect(intent.moveX).toBe(0);
    expect(intent.sprint).toBe(true);
  });
});

describe('HumanController — 슛 충전', () => {
  it('누르는 동안 충전하고, 떼는 스텝에 한 번만 킥을 낸다', () => {
    const keys = new FakeKeys();
    const c = new HumanController(keys, DT);
    const intent = createIntent();
    keys.pressed.add(KEYS.SHOOT);
    for (let i = 0; i < 30; i++) {
      c.sample(intent);
      expect(intent.kick).toBeNull();
    }
    expect(c.charge).toBeCloseTo((30 * DT) / SHOT.CHARGE_TIME);
    keys.pressed.delete(KEYS.SHOOT);
    keys.pressed.add(KEYS.UP);
    c.sample(intent);
    expect(intent.kick).toMatchObject({ type: 'shot', aimY: -1 });
    expect(intent.kick?.power).toBeCloseTo(0.5);
    c.sample(intent);
    expect(intent.kick).toBeNull();
    expect(c.charge).toBe(0);
  });

  it('최대 충전 시간을 넘겨도 power는 1', () => {
    const keys = new FakeKeys();
    const c = new HumanController(keys, DT);
    const intent = createIntent();
    keys.pressed.add(KEYS.SHOOT);
    for (let i = 0; i < 200; i++) c.sample(intent);
    keys.pressed.delete(KEYS.SHOOT);
    c.sample(intent);
    expect(intent.kick?.power).toBe(1);
  });
});
