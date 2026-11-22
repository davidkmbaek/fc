import type Phaser from 'phaser';
import { CAMERA, RENDER } from '../config';
import type { PitchGeometry } from '../sim/pitch';
import { type CameraBounds, type CameraPos, stepCamera } from './cameraMath';

/** 경기 카메라: 공의 진행 방향을 미리 보여주며 부드럽게 따라간다. DESIGN.md §8 */
export class MatchCamera {
  private readonly pos: CameraPos = { x: 0, y: 0 };
  private readonly bounds: CameraBounds;

  constructor(
    private readonly cam: Phaser.Cameras.Scene2D.Camera,
    geo: PitchGeometry,
  ) {
    const pxPerM = RENDER.PX_PER_M * CAMERA.ZOOM;
    this.bounds = {
      viewHalfW: RENDER.WIDTH / pxPerM / 2,
      viewHalfH: RENDER.HEIGHT / pxPerM / 2,
      worldHalfL: geo.worldHalfLength,
      worldHalfW: geo.worldHalfWidth,
    };
    cam.setZoom(CAMERA.ZOOM);
  }

  /** 바로 목표점으로 (시작·리셋 때) */
  snapTo(x: number, y: number): void {
    this.pos.x = x;
    this.pos.y = y;
    stepCamera(this.pos, x, y, 0, this.bounds);
    this.apply();
  }

  /** (bx, by) 공 위치, (vx, vy) 공 속도, dt 실제 프레임 시간 */
  follow(bx: number, by: number, vx: number, vy: number, dt: number): void {
    const tx = bx + vx * CAMERA.LOOKAHEAD_S;
    const ty = by + vy * CAMERA.LOOKAHEAD_S;
    stepCamera(this.pos, tx, ty, dt, this.bounds);
    this.apply();
  }

  private apply(): void {
    this.cam.centerOn(this.pos.x * RENDER.PX_PER_M, this.pos.y * RENDER.PX_PER_M);
  }
}
