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

describe('HumanController — 킥 종류', () => {
  it('S 패스, W 스루, A 로빙, D 슛', () => {
    const cases = [
      [KEYS.PASS, 'pass'],
      [KEYS.THROUGH, 'through'],
      [KEYS.LOB, 'lob'],
      [KEYS.SHOOT, 'shot'],
    ] as const;
    for (const [key, type] of cases) {
      const keys = new FakeKeys();
      const c = new HumanController(keys, DT);
      const intent = createIntent();
      keys.pressed.add(key);
      c.sample(intent);
      expect(c.chargingType).toBe(type);
      keys.pressed.delete(key);
      c.sample(intent);
      expect(intent.kick?.type).toBe(type);
    }
  });

  it('충전 중에는 처음 누른 버튼만 본다', () => {
    const keys = new FakeKeys();
    const c = new HumanController(keys, DT);
    const intent = createIntent();
    keys.pressed.add(KEYS.PASS);
    c.sample(intent);
    keys.pressed.add(KEYS.SHOOT);
    c.sample(intent);
    keys.pressed.delete(KEYS.SHOOT);
    c.sample(intent);
    expect(intent.kick).toBeNull();
    keys.pressed.delete(KEYS.PASS);
    c.sample(intent);
    expect(intent.kick?.type).toBe('pass');
  });

  it('reset()은 충전을 버린다', () => {
    const keys = new FakeKeys();
    const c = new HumanController(keys, DT);
    const intent = createIntent();
    keys.pressed.add(KEYS.PASS);
    c.sample(intent);
    c.reset();
    expect(c.charge).toBe(0);
  });
});

describe('HumanController — 수비 중 태클', () => {
  it('수비 중 S는 스탠딩 태클, A는 슬라이딩 태클 (누르는 순간 한 번)', () => {
    const keys = new FakeKeys();
    const c = new HumanController(keys, DT);
    const intent = createIntent();
    keys.pressed.add(KEYS.PASS);
    c.sample(intent, true);
    expect(intent.tackle).toBe('stand');
    c.sample(intent, true);
    expect(intent.tackle).toBeNull();
    expect(c.charge).toBe(0);
    keys.pressed.delete(KEYS.PASS);
    c.sample(intent, true);
    keys.pressed.add(KEYS.LOB);
    c.sample(intent, true);
    expect(intent.tackle).toBe('slide');
  });

  it('공격 중 S는 패스 충전', () => {
    const keys = new FakeKeys();
    const c = new HumanController(keys, DT);
    const intent = createIntent();
    keys.pressed.add(KEYS.PASS);
    c.sample(intent, false);
    expect(intent.tackle).toBeNull();
    expect(c.chargingType).toBe('pass');
  });
});
