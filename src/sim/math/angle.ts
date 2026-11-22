const TWO_PI = Math.PI * 2;

/** 각도를 (-π, π] 범위로 */
export function wrapAngle(a: number): number {
  let r = a % TWO_PI;
  if (r <= -Math.PI) r += TWO_PI;
  else if (r > Math.PI) r -= TWO_PI;
  return r;
}

/** from에서 to로 가는 가장 짧은 회전 (부호 포함, -π ~ π) */
export function angleDiff(from: number, to: number): number {
  return wrapAngle(to - from);
}

/** current를 target 쪽으로 최대 maxDelta만큼 회전 */
export function rotateToward(current: number, target: number, maxDelta: number): number {
  const d = angleDiff(current, target);
  if (Math.abs(d) <= maxDelta) return wrapAngle(target);
  return wrapAngle(current + Math.sign(d) * maxDelta);
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
