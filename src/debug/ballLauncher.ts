import type Phaser from 'phaser';
import { DEBUG, RENDER } from '../config';

/**
 * 개발 도구: 클릭한 지점으로 공을 보낸다. Shift+클릭은 공중 볼. DESIGN.md §9
 * 드래그(화면 이동)와 구분하기 위해 거의 움직이지 않고 뗀 포인터만 클릭으로 본다.
 */
export function enableBallLauncher(
  scene: Phaser.Scene,
  launch: (x: number, y: number, lofted: boolean) => void,
): void {
  scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    const moved = Math.hypot(pointer.upX - pointer.downX, pointer.upY - pointer.downY);
    if (moved > DEBUG.CLICK_MAX_MOVE_PX) return;
    const world = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const lofted = pointer.event instanceof MouseEvent && pointer.event.shiftKey;
    launch(world.x / RENDER.PX_PER_M, world.y / RENDER.PX_PER_M, lofted);
  });
}
