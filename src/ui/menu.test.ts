import { describe, expect, it } from 'vitest';
import { Menu } from './menu';

const make = (): Menu =>
  new Menu([
    { id: 'start', label: '경기 시작' },
    { id: 'diff', label: '난이도', options: ['쉬움', '보통', '어려움'], value: 1 },
    { id: 'help', label: '조작 방법' },
  ]);

describe('Menu', () => {
  it('위·아래 이동은 끝에서 반대쪽으로 돈다', () => {
    const m = make();
    m.move(-1);
    expect(m.current?.id).toBe('help');
    m.move(1);
    expect(m.current?.id).toBe('start');
  });

  it('값 고르기 항목만 ←→로 바뀌고 끝에서 돈다', () => {
    const m = make();
    m.change(1); // 실행 항목: 변화 없음
    m.move(1);
    m.change(1);
    expect(m.valueOf('diff')).toBe(2);
    m.change(1);
    expect(m.valueOf('diff')).toBe(0);
    expect(m.text(1)).toContain('쉬움');
  });
});
