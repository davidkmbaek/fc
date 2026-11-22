import Phaser from 'phaser';
import { RENDER } from './config';
import { DebugOverlayScene } from './scenes/DebugOverlayScene';
import { MatchScene } from './scenes/MatchScene';

new Phaser.Game({
  type: Phaser.AUTO,
  backgroundColor: RENDER.BACKGROUND_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: RENDER.WIDTH,
    height: RENDER.HEIGHT,
  },
  // 목록 순서 = 그리는 순서. 오버레이(HUD)가 경기 화면 위에 오도록 뒤에 둔다
  scene: [MatchScene, DebugOverlayScene],
});
