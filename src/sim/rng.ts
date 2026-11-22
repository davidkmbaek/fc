/**
 * 시드 고정 난수 생성기 (mulberry32).
 * 시뮬레이션 안에서는 Math.random() 대신 이것만 쓴다 (CLAUDE.md 규칙 4).
 * 상태는 32비트 정수 하나라서 저장·복원(리플레이)이 쉽다.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** [0, 1) 범위의 실수 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min, max) 범위의 실수 */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** [min, max] 범위의 정수 */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** 확률 p로 true */
  chance(p: number): boolean {
    return this.next() < p;
  }

  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }
}
