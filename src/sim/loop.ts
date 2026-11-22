/**
 * 고정 타임스텝 시계 (누적기 방식). CLAUDE.md 규칙 2.
 *
 * 매 프레임 `advance(실제 경과 초)`가 이번 프레임에 실행할 스텝 수를 돌려준다.
 * 렌더링은 `alpha`(누적기 잔여 시간 / dt)로 이전·현재 상태를 보간한다.
 */
export class FixedStepClock {
  /** 배속 (0.25 = 4배 느리게). 시뮬레이션 dt는 그대로이고 스텝 빈도만 바뀐다 */
  timeScale = 1;
  paused = false;

  private accumulator = 0;
  private pendingSteps = 0;

  constructor(
    readonly dt: number,
    readonly maxStepsPerFrame: number,
  ) {}

  advance(realDt: number): number {
    if (this.paused) {
      const n = Math.min(this.pendingSteps, this.maxStepsPerFrame);
      this.pendingSteps -= n;
      return n;
    }

    this.accumulator += Math.max(0, realDt) * this.timeScale;
    // 1e-9: 0.1 + 0.2 같은 부동소수 오차로 스텝 하나를 놓치지 않게
    let steps = Math.floor(this.accumulator / this.dt + 1e-9);

    if (steps > this.maxStepsPerFrame) {
      // 탭 복귀·렉으로 시간이 많이 쌓이면 상한만큼만 처리하고 나머지는 버린다
      steps = this.maxStepsPerFrame;
      this.accumulator = 0;
    } else {
      this.accumulator = Math.max(0, this.accumulator - steps * this.dt);
    }
    return steps;
  }

  /** 일시정지 중에 한 스텝만 진행하도록 예약한다. 일시정지가 아니면 무시 */
  requestStep(): void {
    if (this.paused) this.pendingSteps++;
  }

  /** 0 이상 1 미만. 이전 상태와 현재 상태 사이 어디를 그릴지 */
  get alpha(): number {
    return Math.min(this.accumulator / this.dt, 1 - 1e-9);
  }
}
