import Phaser from 'phaser';
import { HUD_STYLE, RENDER } from '../config';

export const HUD_KEY = 'Hud';

/**
 * HUD 씬: 경기 카메라와 무관하게 화면에 고정. 지금은 이벤트 배너만 (점수판·시계는 4.3).
 * 시뮬레이션 상태를 바꾸지 않는다.
 */
export class HudScene extends Phaser.Scene {
  private banner?: Phaser.GameObjects.Text;
  private bannerLeft = 0;

  constructor() {
    super(HUD_KEY);
  }

  create(): void {
    this.banner = this.add
      .text(RENDER.WIDTH / 2, HUD_STYLE.BANNER_Y, '', {
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        fontSize: HUD_STYLE.BANNER_FONT_SIZE,
        color: HUD_STYLE.BANNER_COLOR,
        stroke: HUD_STYLE.BANNER_STROKE,
        strokeThickness: HUD_STYLE.BANNER_STROKE_PX,
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  showBanner(text: string, small: boolean): void {
    if (!this.banner) return;
    this.banner
      .setText(text)
      .setFontSize(small ? HUD_STYLE.BANNER_SMALL_FONT_SIZE : HUD_STYLE.BANNER_FONT_SIZE)
      .setVisible(true);
    this.bannerLeft = small ? HUD_STYLE.BANNER_SMALL_SECONDS : HUD_STYLE.BANNER_SECONDS;
  }

  override update(_time: number, deltaMs: number): void {
    if (this.bannerLeft <= 0) return;
    this.bannerLeft -= deltaMs / 1000;
    if (this.bannerLeft <= 0) this.banner?.setVisible(false);
  }
}
