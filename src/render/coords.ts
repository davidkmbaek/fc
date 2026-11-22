import { RENDER } from '../config';

/**
 * 시뮬레이션 좌표(미터) → Phaser 월드 좌표(픽셀).
 * 원점(센터 스팟)이 월드 (0, 0), x는 오른쪽, y는 아래쪽. 높이 z는 화면 위쪽으로 옮겨 그린다.
 * 매 프레임 쓰이므로 객체를 만들지 않는 스칼라 함수로 둔다.
 */
export function mToPx(meters: number): number {
  return meters * RENDER.PX_PER_M;
}

export function worldPxX(x: number): number {
  return x * RENDER.PX_PER_M;
}

export function worldPxY(y: number, z = 0): number {
  return (y - z * RENDER.Z_SCREEN_SCALE) * RENDER.PX_PER_M;
}
