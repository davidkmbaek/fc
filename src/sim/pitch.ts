import { PITCH } from '../config';

export type PitchSpec = { readonly [K in keyof typeof PITCH]: number };

/**
 * 경기장 규격에서 계산한 위치들. 모든 x는 +x 쪽(오른쪽) 기준의 절댓값이며,
 * 왼쪽은 부호만 바꿔 쓴다. 좌표계는 DESIGN.md §2 (원점 = 센터 스팟).
 */
export interface PitchGeometry {
  readonly halfLength: number;
  readonly halfWidth: number;
  /** 골포스트 y (±) — 포스트 중심 */
  readonly goalHalfWidth: number;
  readonly goalHeight: number;
  readonly goalDepth: number;
  /** 페널티 에어리어 안쪽 경계의 |x| */
  readonly penaltyAreaX: number;
  readonly penaltyAreaHalfWidth: number;
  /** 골 에어리어 안쪽 경계의 |x| */
  readonly goalAreaX: number;
  readonly goalAreaHalfWidth: number;
  /** 페널티 스폿의 |x| */
  readonly penaltySpotX: number;
  readonly circleRadius: number;
  /**
   * 페널티 아크(스폿 중심, 반지름 circleRadius) 중 페널티 에어리어 밖 부분의 반각(라디안).
   * 아크는 센터 쪽 방향 ±이 각도만큼 그린다.
   */
  readonly penaltyArcHalfAngle: number;
  readonly cornerArcRadius: number;
  /** 여백을 포함한 월드 경계 (±) */
  readonly worldHalfLength: number;
  readonly worldHalfWidth: number;
}

export function computePitchGeometry(spec: PitchSpec = PITCH): PitchGeometry {
  const halfLength = spec.LENGTH / 2;
  const halfWidth = spec.WIDTH / 2;
  const penaltyAreaX = halfLength - spec.PENALTY_AREA_DEPTH;
  const penaltySpotX = halfLength - spec.PENALTY_SPOT_DISTANCE;
  const spotToAreaEdge = penaltySpotX - penaltyAreaX;

  return {
    halfLength,
    halfWidth,
    goalHalfWidth: spec.GOAL_WIDTH / 2,
    goalHeight: spec.GOAL_HEIGHT,
    goalDepth: spec.GOAL_DEPTH,
    penaltyAreaX,
    penaltyAreaHalfWidth: spec.PENALTY_AREA_WIDTH / 2,
    goalAreaX: halfLength - spec.GOAL_AREA_DEPTH,
    goalAreaHalfWidth: spec.GOAL_AREA_WIDTH / 2,
    penaltySpotX,
    circleRadius: spec.CIRCLE_RADIUS,
    penaltyArcHalfAngle: Math.acos(spotToAreaEdge / spec.CIRCLE_RADIUS),
    cornerArcRadius: spec.CORNER_ARC_RADIUS,
    worldHalfLength: halfLength + spec.MARGIN,
    worldHalfWidth: halfWidth + spec.MARGIN,
  };
}
