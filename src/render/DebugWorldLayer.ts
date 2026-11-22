import type Phaser from 'phaser';
import { DEBUG_WORLD, DRIBBLE, RENDER } from '../config';
import type { SimState } from '../sim/Simulation';
import { mToPx, worldPxX, worldPxY } from './coords';

/**
 * 디버그 오버레이를 켰을 때 월드 위에 그리는 것: 컨트롤 반경, 선수·공 속도 벡터. DESIGN.md §9
 * AI 상태·지원 위치·패스 경로는 3단계에서 추가한다.
 */
export class DebugWorldLayer {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(RENDER.DEPTH.DEBUG_WORLD);
  }

  update(s: SimState, visible: boolean): void {
    const g = this.g;
    g.clear();
    if (!visible) return;
    const k = DEBUG_WORLD.VELOCITY_SCALE_S;

    for (const p of s.players) {
      g.lineStyle(DEBUG_WORLD.LINE_PX, DEBUG_WORLD.CONTROL_COLOR, 0.8);
      g.strokeCircle(worldPxX(p.x), worldPxY(p.y), mToPx(DRIBBLE.CONTROL_RADIUS));
      g.lineStyle(DEBUG_WORLD.LINE_PX, DEBUG_WORLD.VELOCITY_COLOR, 1);
      g.lineBetween(
        worldPxX(p.x),
        worldPxY(p.y),
        worldPxX(p.x + p.vx * k),
        worldPxY(p.y + p.vy * k),
      );
    }

    const b = s.ball;
    g.lineStyle(DEBUG_WORLD.LINE_PX, DEBUG_WORLD.BALL_VELOCITY_COLOR, 1);
    g.lineBetween(worldPxX(b.x), worldPxY(b.y), worldPxX(b.x + b.vx * k), worldPxY(b.y + b.vy * k));
  }
}
