import Phaser from 'phaser';
import { RENDER } from './config';
import { DebugOverlayScene } from './scenes/DebugOverlayScene';
import { HudScene } from './scenes/HudScene';
import { MatchScene } from './scenes/MatchScene';
import { PauseScene } from './scenes/PauseScene';
import { TitleScene } from './scenes/TitleScene';

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
  // 첫 씬(타이틀)이 시작된다. 목록 순서 = 그리는 순서: HUD·오버레이·일시정지 메뉴가 경기 화면 위
  scene: [TitleScene, MatchScene, HudScene, DebugOverlayScene, PauseScene],
});
