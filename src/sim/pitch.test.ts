import { describe, expect, it } from 'vitest';
import { computePitchGeometry } from './pitch';

describe('computePitchGeometry (기본 규격)', () => {
  const g = computePitchGeometry();

  it('DESIGN.md §2 좌표와 일치한다', () => {
    expect(g.halfLength).toBe(52.5);
    expect(g.halfWidth).toBe(34);
    expect(g.goalHalfWidth).toBeCloseTo(3.66);
    expect(g.penaltyAreaX).toBeCloseTo(36);
    expect(g.penaltyAreaHalfWidth).toBeCloseTo(20.16);
    expect(g.goalAreaX).toBeCloseTo(47);
    expect(g.goalAreaHalfWidth).toBeCloseTo(9.16);
    expect(g.penaltySpotX).toBeCloseTo(41.5);
    expect(g.worldHalfLength).toBe(58.5);
    expect(g.worldHalfWidth).toBe(40);
  });

  it('페널티 아크의 양 끝은 페널티 에어리어 경계선 위에 있다', () => {
    const endX = g.penaltySpotX - g.circleRadius * Math.cos(g.penaltyArcHalfAngle);
    expect(endX).toBeCloseTo(g.penaltyAreaX, 9);
    expect((g.penaltyArcHalfAngle * 180) / Math.PI).toBeCloseTo(53.05, 1);
  });

  it('구역들이 안쪽부터 골 에어리어 < 페널티 스폿 < 페널티 에어리어 순으로 놓인다', () => {
    expect(g.goalAreaX).toBeGreaterThan(g.penaltySpotX);
    expect(g.penaltySpotX).toBeGreaterThan(g.penaltyAreaX);
    expect(g.penaltyAreaHalfWidth).toBeLessThan(g.halfWidth);
    expect(g.goalAreaHalfWidth).toBeGreaterThan(g.goalHalfWidth);
  });
});

describe('computePitchGeometry (사용자 규격)', () => {
  it('규격을 바꾸면 계산값도 따라 바뀐다', () => {
    const g = computePitchGeometry({
      LENGTH: 40,
      WIDTH: 20,
      GOAL_WIDTH: 3,
      GOAL_HEIGHT: 2,
      GOAL_DEPTH: 1,
      POST_RADIUS: 0.05,
      PENALTY_AREA_DEPTH: 6,
      PENALTY_AREA_WIDTH: 12,
      GOAL_AREA_DEPTH: 2,
      GOAL_AREA_WIDTH: 6,
      PENALTY_SPOT_DISTANCE: 4,
      CIRCLE_RADIUS: 3,
      CORNER_ARC_RADIUS: 0.5,
      LINE_WIDTH: 0.1,
      MARGIN: 2,
    });
    expect(g.penaltyAreaX).toBe(14);
    expect(g.penaltySpotX).toBe(16);
    expect(g.penaltyArcHalfAngle).toBeCloseTo(Math.acos(2 / 3));
    expect(g.worldHalfLength).toBe(22);
  });
});
