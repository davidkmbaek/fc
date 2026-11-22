import Phaser from 'phaser';
import { BALL, BALL_STYLE, RENDER } from '../config';
import type { BallState } from '../sim/ball';
import { lerp } from '../sim/math/scalar';
import { mToPx, worldPxX, worldPxY } from './coords';

/**
 * 공과 그림자. DESIGN.md §8
 * - 그림자: (x, y)에, 높을수록 흐리고 작게
 * - 공: (x, y - z × Z_SCREEN_SCALE)에, 크기 1 + z × Z_SIZE_GAIN
 */
export class BallView {
  private readonly shadow: Phaser.GameObjects.Arc;
  private readonly ball: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene) {
    const r = mToPx(BALL.RADIUS * BALL_STYLE.VISUAL_SCALE);
    this.shadow = scene.add
      .circle(0, 0, r, BALL_STYLE.SHADOW_COLOR, 1)
      .setDepth(RENDER.DEPTH.SHADOWS);
    this.ball = scene.add
      .circle(0, 0, r, BALL_STYLE.COLOR)
      .setStrokeStyle(BALL_STYLE.OUTLINE_PX, BALL_STYLE.OUTLINE_COLOR)
      .setDepth(RENDER.DEPTH.BALL);
  }

  update(prev: BallState, curr: BallState, alpha: number): void {
    const x = lerp(prev.x, curr.x, alpha);
    const y = lerp(prev.y, curr.y, alpha);
    const z = Math.max(0, lerp(prev.z, curr.z, alpha));

    this.shadow
      .setPosition(worldPxX(x), worldPxY(y))
      .setAlpha(BALL_STYLE.SHADOW_ALPHA / (1 + z * BALL_STYLE.SHADOW_FADE_PER_M))
      .setScale(1 / (1 + z * BALL_STYLE.SHADOW_SHRINK_PER_M));
    this.ball.setPosition(worldPxX(x), worldPxY(y, z)).setScale(1 + z * BALL_STYLE.Z_SIZE_GAIN);
  }
}
