/**
 * 배속 단계(오름차순)에서 한 칸 느리게(-1) 또는 빠르게(+1).
 * 현재 값이 목록에 없으면 가장 빠른 단계로 본다. 양 끝에서는 그대로 둔다.
 */
export function nextTimeScale(current: number, dir: 1 | -1, scales: readonly number[]): number {
  const found = scales.indexOf(current);
  const i = found < 0 ? scales.length - 1 : found;
  const j = Math.min(scales.length - 1, Math.max(0, i + dir));
  return scales[j] ?? current;
}
