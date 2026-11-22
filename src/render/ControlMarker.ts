import type Phaser from 'phaser';
import { PLAYER_STYLE, RENDER } from '../config';
import { mToPx, worldPxX, worldPxY } from './coords';

/**
 * 조작 선수 표시. DESIGN.md §8
 * - 화면 안: 머리 위에 팀 색 화살표(아래를 가리킴)
 * - 화면 밖: 화면 가장자리에 선수 쪽을 가리키는 화살표
 */
export class ControlMarker {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly cam: Phaser.Cameras.Scene2D.Camera,
    private readonly color: number,
  ) {
    this.g = scene.add.graphics().setDepth(RENDER.DEPTH.DEBUG_WORLD - 2);
  }

  /** (x, y) 조작 선수 위치 (m) */
  update(x: number, y: number): void {
    const g = this.g;
    g.clear();
    const view = this.cam.worldView;
    const px = worldPxX(x);
    const py = worldPxY(y);
    const size = mToPx(PLAYER_STYLE.MARKER_SIZE);
    const margin = PLAYER_STYLE.MARKER_EDGE_MARGIN_PX / this.cam.zoom;

    g.fillStyle(this.color, 1);
    g.lineStyle(PLAYER_STYLE.MARKER_OUTLINE_PX, PLAYER_STYLE.MARKER_OUTLINE_COLOR, 1);

    if (view.contains(px, py)) {
      const tipY = py - mToPx(PLAYER_STYLE.MARKER_OFFSET_Y);
      const topY = tipY - size;
      g.fillTriangle(px, tipY, px - size / 2, topY, px + size / 2, topY);
      g.strokeTriangle(px, tipY, px - size / 2, topY, px + size / 2, topY);
      return;
    }

    // 화면 밖: 가장자리 안쪽으로 자른 위치에, 선수 쪽을 가리키는 삼각형
    const ex = Math.min(Math.max(px, view.x + margin), view.right - margin);
    const ey = Math.min(Math.max(py, view.y + margin), view.bottom - margin);
    const a = Math.atan2(py - ey, px - ex);
    const tipX = ex + Math.cos(a) * size;
    const tipY = ey + Math.sin(a) * size;
    const lx = ex + Math.cos(a + 2.4) * size * 0.7;
    const ly = ey + Math.sin(a + 2.4) * size * 0.7;
    const rx = ex + Math.cos(a - 2.4) * size * 0.7;
    const ry = ey + Math.sin(a - 2.4) * size * 0.7;
    g.fillTriangle(tipX, tipY, lx, ly, rx, ry);
    g.strokeTriangle(tipX, tipY, lx, ly, rx, ry);
  }
}
