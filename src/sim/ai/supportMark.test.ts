import { describe, expect, it } from 'vitest';
import { AI } from '../../config';
import { computePitchGeometry } from '../pitch';
import { createPlayer } from '../player';
import { passSafety, typicalPassSpeed } from './intercept';
import { assignMarks, markSpot } from './marking';
import { bestSupportSpot } from './support';

const geo = computePitchGeometry();

describe('bestSupportSpot', () => {
  it('홈 위치 반경 안에서, 패스 길이 열린(안전한) 곳을 고른다', () => {
    const owner = createPlayer(0, 0, 0, 0);
    // 홈 위치 (15, 0) 바로 앞 경로를 상대가 막고 있다
    const players = [owner, createPlayer(1, 0, 15, 0), createPlayer(9, 1, 8, 0)];
    const out = bestSupportSpot(owner, 15, 0, 1, players, geo, { x: 0, y: 0 });
    expect(Math.hypot(out.x - 15, out.y)).toBeLessThanOrEqual(AI.SUPPORT_RADIUS);
    // 홈 위치(15, 0)로 가는 길은 막혀 있지만, 고른 곳으로 가는 길은 안전하다
    const opp = players.filter((p) => p.team === 1);
    const d = Math.hypot(out.x, out.y);
    expect(passSafety(0, 0, 15, 0, typicalPassSpeed(15), opp)).toBeLessThan(0);
    expect(passSafety(0, 0, out.x, out.y, typicalPassSpeed(d), opp)).toBeGreaterThan(0);
  });

  it('경기장 밖은 고르지 않는다', () => {
    const owner = createPlayer(0, 0, 40, 30);
    const out = bestSupportSpot(owner, 48, 32, 1, [owner], geo, { x: 0, y: 0 });
    expect(Math.abs(out.x)).toBeLessThanOrEqual(geo.halfLength - 2);
    expect(Math.abs(out.y)).toBeLessThanOrEqual(geo.halfWidth - 2);
  });
});

describe('assignMarks / markSpot', () => {
  const ownGoalX = -geo.halfLength;

  it('우리 골문에 가까운 상대부터, 가장 빨리 닿는 수비수를 붙인다', () => {
    const players = [
      createPlayer(0, 0, -30, 5, 0, 'DF'),
      createPlayer(1, 0, -30, -5, 0, 'DF'),
      createPlayer(5, 1, -35, 6, 0, 'FW'), // 더 위협적 (골문에 가까움)
      createPlayer(6, 1, -20, -6, 0, 'MF'),
    ];
    const out: number[] = [];
    assignMarks(players, 0, ownGoalX, [], out);
    expect(out[0]).toBe(5);
    expect(out[1]).toBe(6);
  });

  it('제외 목록(압박 담당·공 가진 상대)과 너무 먼 상대는 배정하지 않는다', () => {
    const players = [
      createPlayer(0, 0, -30, 0, 0, 'DF'),
      createPlayer(5, 1, -35, 0, 0, 'FW'),
      createPlayer(6, 1, 40, 0, 0, 'FW'),
    ];
    const out: number[] = [];
    assignMarks(players, 0, ownGoalX, [5], out);
    expect(out[0]).toBe(-1);
  });

  it('마크 위치는 상대와 우리 골문 사이', () => {
    const o = createPlayer(5, 1, -30, 0);
    const s = markSpot(o, ownGoalX, { x: 0, y: 0 });
    expect(s.x).toBeCloseTo(-30 - AI.MARK_DIST);
    expect(s.y).toBeCloseTo(0);
  });
});
