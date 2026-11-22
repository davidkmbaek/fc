import type Phaser from 'phaser';
import { PLAYER_STYLE, RENDER } from '../config';
import { mToPx, worldPxX, worldPxY } from './coords';

/** 조작 선수 머리 위 파워 게이지. 충전 중일 때만 보인다. DESIGN.md §5 */
export class PowerGauge {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(RENDER.DEPTH.DEBUG_WORLD - 1);
  }

  /** (x, y) 선수 위치(m), charge 0 ~ 1 */
  update(x: number, y: number, charge: number): void {
    this.g.clear();
    if (charge <= 0) return;
    const w = mToPx(PLAYER_STYLE.GAUGE_WIDTH);
    const h = mToPx(PLAYER_STYLE.GAUGE_HEIGHT);
    const left = worldPxX(x) - w / 2;
    const top = worldPxY(y - PLAYER_STYLE.GAUGE_OFFSET_Y) - h / 2;
    this.g.fillStyle(PLAYER_STYLE.GAUGE_BG, 0.6);
    this.g.fillRect(left - 1, top - 1, w + 2, h + 2);
    this.g.fillStyle(charge >= 1 ? PLAYER_STYLE.GAUGE_FULL : PLAYER_STYLE.GAUGE_FILL, 1);
    this.g.fillRect(left, top, w * charge, h);
  }
}
