import type Phaser from 'phaser';
import { DEV_CAMERA } from '../config';

/**
 * 개발 빌드 전용 임시 카메라 조작: 휠로 커서 기준 확대·축소, 드래그로 이동.
 * 최소 배율(minZoom)까지 축소하면 원점으로 다시 맞춘다. 1.3에서 경기 카메라로 대체한다.
 */
export function enableDevCameraControls(scene: Phaser.Scene, minZoom: number): void {
  const cam = scene.cameras.main;

  scene.input.on(
    'wheel',
    (pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      const before = cam.getWorldPoint(pointer.x, pointer.y);
      const factor = dy < 0 ? DEV_CAMERA.WHEEL_ZOOM_FACTOR : 1 / DEV_CAMERA.WHEEL_ZOOM_FACTOR;
      const zoom = Math.min(DEV_CAMERA.MAX_ZOOM, Math.max(minZoom, cam.zoom * factor));
      cam.setZoom(zoom);
      if (zoom <= minZoom) {
        cam.centerOn(0, 0);
        return;
      }
      const after = cam.getWorldPoint(pointer.x, pointer.y);
      cam.scrollX += before.x - after.x;
      cam.scrollY += before.y - after.y;
    },
  );

  scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    if (!pointer.isDown) return;
    cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
    cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
  });
}
