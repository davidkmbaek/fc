/**
 * 굴러가는 공 모델 dv/dt = -(a + b·v)의 해석해. DESIGN.md §5 "땅볼 패스 속도"
 * a = ROLL_DECEL, b = ROLL_DAMPING (b > 0)
 */

/** 속도가 v0에서 v1까지 줄어드는 데 걸리는 시간 */
export function rollTime(v0: number, v1: number, a: number, b: number): number {
  const c = a / b;
  return Math.log((v0 + c) / (v1 + c)) / b;
}

/** 속도가 v0에서 v1까지 줄어드는 동안 이동한 거리 */
export function rollDistance(v0: number, v1: number, a: number, b: number): number {
  return (v0 - v1) / b - (a / b) * rollTime(v0, v1, a, b);
}

const BISECTION_ITERATIONS = 50;

/**
 * 거리 d를 굴러간 뒤 속도가 arrive가 되는 초기 속도 v0 (이분법).
 * maxSpeed로도 닿지 않으면 maxSpeed를 돌려준다.
 */
export function rollSpeedForDistance(
  d: number,
  arrive: number,
  a: number,
  b: number,
  maxSpeed: number,
): number {
  if (d <= 0) return arrive;
  if (rollDistance(maxSpeed, arrive, a, b) <= d) return maxSpeed;
  let lo = arrive;
  let hi = maxSpeed;
  for (let i = 0; i < BISECTION_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (rollDistance(mid, arrive, a, b) < d) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
