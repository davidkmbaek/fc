import { CAMERA } from '../config';

/** 카메라 중심 (미터) */
export interface CameraPos {
  x: number;
  y: number;
}

export interface CameraBounds {
  /** 화면에 보이는 영역의 반폭·반높이 (m) */
  viewHalfW: number;
  viewHalfH: number;
  /** 월드(경기장 + 여백)의 반길이·반폭 (m) */
  worldHalfL: number;
  worldHalfW: number;
}

/**
 * 카메라를 목표점(tx, ty) 쪽으로 한 프레임 움직인다. DESIGN.md §8
 * 1. 데드존: 목표가 중심에서 DEADZONE 이상 벗어난 만큼만 따라간다
 * 2. 부드럽게: 프레임레이트와 무관한 지수 감쇠 (1 - e^(-rate·dt))
 * 3. 월드 밖이 보이지 않게 자른다 (월드보다 화면이 크면 가운데)
 * Phaser 없이 테스트할 수 있도록 순수 함수로 둔다.
 */
export function stepCamera(
  cam: CameraPos,
  tx: number,
  ty: number,
  dt: number,
  b: CameraBounds,
): void {
  const desiredX = deadzone(cam.x, tx, CAMERA.DEADZONE_X);
  const desiredY = deadzone(cam.y, ty, CAMERA.DEADZONE_Y);
  const k = 1 - Math.exp(-CAMERA.FOLLOW_RATE * dt);
  cam.x = clampAxis(cam.x + (desiredX - cam.x) * k, b.worldHalfL, b.viewHalfW);
  cam.y = clampAxis(cam.y + (desiredY - cam.y) * k, b.worldHalfW, b.viewHalfH);
}

/** 목표가 데드존 안이면 현재 위치, 밖이면 데드존 경계가 목표에 닿는 위치 */
function deadzone(current: number, target: number, zone: number): number {
  const d = target - current;
  if (Math.abs(d) <= zone) return current;
  return target - Math.sign(d) * zone;
}

function clampAxis(v: number, worldHalf: number, viewHalf: number): number {
  const max = worldHalf - viewHalf;
  if (max <= 0) return 0;
  return Math.max(-max, Math.min(max, v));
}
