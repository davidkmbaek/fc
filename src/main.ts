import Phaser from 'phaser';
import { RENDER } from './config';
import { DebugOverlayScene } from './scenes/DebugOverlayScene';
import { HudScene } from './scenes/HudScene';
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
  // 목록 순서 = 그리는 순서. HUD와 디버그 오버레이가 경기 화면 위에 오도록 뒤에 둔다
  scene: [MatchScene, HudScene, DebugOverlayScene],
});
