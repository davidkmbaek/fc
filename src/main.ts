import Phaser from 'phaser';
import { RENDER } from './config';
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
  scene: [MatchScene],
});
