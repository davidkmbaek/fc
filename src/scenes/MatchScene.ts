import Phaser from 'phaser';
import { RENDER } from '../config';

/** 경기 화면. 0.1에서는 실행 확인용 텍스트만 표시한다. 경기장은 0.2에서 그린다. */
export class MatchScene extends Phaser.Scene {
  constructor() {
    super('MatchScene');
  }

  create(): void {
    this.add
      .text(RENDER.WIDTH / 2, RENDER.HEIGHT / 2, `0.1 OK — Phaser ${Phaser.VERSION}`, {
        fontFamily: 'sans-serif',
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }
}
