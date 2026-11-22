import { describe, expect, it } from 'vitest';
import { FixedStepClock } from './loop';

const DT = 1 / 60;
const make = (): FixedStepClock => new FixedStepClock(DT, 5);

describe('FixedStepClock', () => {
  it('60Hz 프레임이면 매 프레임 1스텝, alpha ≈ 0', () => {
    const c = make();
    for (let i = 0; i < 120; i++) expect(c.advance(DT)).toBe(1);
    expect(c.alpha).toBeCloseTo(0, 6);
  });

  it('144Hz 프레임이면 1초 동안 정확히 60스텝', () => {
    const c = make();
    let total = 0;
    for (let i = 0; i < 144; i++) total += c.advance(1 / 144);
    expect(total).toBe(60);
  });

  it('스텝 사이에 남은 시간이 alpha가 된다', () => {
    const c = make();
    expect(c.advance(DT * 1.5)).toBe(1);
    expect(c.alpha).toBeCloseTo(0.5, 6);
    expect(c.advance(DT * 0.25)).toBe(0);
    expect(c.alpha).toBeCloseTo(0.75, 6);
  });

  it('탭 복귀처럼 큰 시간이 들어와도 최대 스텝 수만 처리하고 나머지는 버린다', () => {
    const c = make();
    expect(c.advance(10)).toBe(5);
    expect(c.alpha).toBe(0);
    expect(c.advance(DT)).toBe(1);
  });

  it('0.25배속이면 4프레임에 1스텝', () => {
    const c = make();
    c.timeScale = 0.25;
    const steps = Array.from({ length: 8 }, () => c.advance(DT));
    expect(steps.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('일시정지 중에는 시간이 흐르지 않고 alpha도 그대로다', () => {
    const c = make();
    c.advance(DT * 1.5);
    const alpha = c.alpha;
    c.paused = true;
    expect(c.advance(1)).toBe(0);
    expect(c.alpha).toBe(alpha);
  });

  it('일시정지 중 requestStep()은 정확히 1스텝씩 진행한다', () => {
    const c = make();
    c.paused = true;
    c.requestStep();
    expect(c.advance(DT)).toBe(1);
    expect(c.advance(DT)).toBe(0);
    c.requestStep();
    c.requestStep();
    expect(c.advance(DT)).toBe(2);
  });

  it('일시정지가 아니면 requestStep()은 무시된다', () => {
    const c = make();
    c.requestStep();
    expect(c.advance(0)).toBe(0);
  });

  it('음수 경과 시간은 0으로 취급한다', () => {
    const c = make();
    expect(c.advance(-1)).toBe(0);
    expect(c.alpha).toBe(0);
  });
});
