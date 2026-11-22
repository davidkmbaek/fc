import { AI } from '../../config';
import { copyBall, createBall, type BallState, stepBall } from '../ball';

/** 공 예상 궤적의 한 점 */
export interface BallSample {
  t: number;
  x: number;
  y: number;
  z: number;
}

/**
 * 공의 예상 궤적. DESIGN.md §7 interceptPoint용
 * 실제 공 물리(stepBall: 공중·바운드·굴러감)를 복사본으로 돌려 AI.PREDICT_DT 간격으로 기록한다.
 * 선수·골대 충돌은 무시한다. 결정 주기마다 한 번 계산해 팀 전체가 같이 쓴다(배열 재사용).
 */
export class BallPrediction {
  readonly samples: BallSample[] = [];
  private readonly scratch: BallState = createBall();

  constructor(private readonly simDt: number) {
    for (let i = 0; i <= AI.PREDICT_SAMPLES; i++) this.samples.push({ t: 0, x: 0, y: 0, z: 0 });
  }

  update(ball: BallState): void {
    const b = this.scratch;
    copyBall(b, ball);
    const stepsPerSample = Math.max(1, Math.round(AI.PREDICT_DT / this.simDt));
    for (let i = 0; i < this.samples.length; i++) {
      const s = this.samples[i] as BallSample;
      s.t = i * stepsPerSample * this.simDt;
      s.x = b.x;
      s.y = b.y;
      s.z = b.z;
      for (let k = 0; k < stepsPerSample; k++) stepBall(b, this.simDt);
    }
  }
}
