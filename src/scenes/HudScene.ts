import Phaser from 'phaser';
import { HUD_STYLE, PITCH, RENDER } from '../config';
import { TEAM_HOME } from '../sim/rules';
import type { SimState } from '../sim/state';
import { formatMatchClock, phaseLabel } from '../ui/clock';
import type { TeamColors } from '../ui/teamColors';
import { SCENE_KEYS } from './keys';

export interface HudData {
  getState: () => SimState;
  getControlledId: () => number;
  colors: TeamColors;
}

/**
 * HUD 씬: 경기 카메라와 무관하게 화면에 고정. DESIGN.md §8
 * 점수판·시계(정식 경기만), 미니맵, 이벤트 배너. 시뮬레이션 상태는 읽기만 한다.
 */
export class HudScene extends Phaser.Scene {
  private hud?: HudData;
  private banner?: Phaser.GameObjects.Text;
  private bannerLeft = 0;
  private score?: Phaser.GameObjects.Text;
  private clock?: Phaser.GameObjects.Text;
  private scoreBox?: Phaser.GameObjects.Container;
  private dots?: Phaser.GameObjects.Graphics;
  private lastScore = '';
  private lastClock = '';
  private mapX = 0;
  private mapY = 0;

  constructor() {
    super(SCENE_KEYS.HUD);
  }

  init(data: HudData): void {
    this.hud = data;
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
    if (!this.hud) return;
    this.createScoreboard(this.hud);
    this.createMinimap();
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
    if (this.bannerLeft > 0) {
      this.bannerLeft -= deltaMs / 1000;
      if (this.bannerLeft <= 0) this.banner?.setVisible(false);
    }
    if (!this.hud) return;
    const s = this.hud.getState();
    this.updateScoreboard(s);
    this.drawDots(s, this.hud);
  }

  private createScoreboard(d: HudData): void {
    const w = HUD_STYLE.SCORE_WIDTH;
    const h = HUD_STYLE.SCORE_HEIGHT;
    const chip = HUD_STYLE.SCORE_CHIP;
    const style = {
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      fontSize: HUD_STYLE.SCORE_FONT_SIZE,
      color: '#ffffff',
    };
    const bg = this.add.rectangle(0, 0, w, h, HUD_STYLE.SCORE_BG, HUD_STYLE.SCORE_BG_ALPHA);
    const home = this.add.rectangle(-w / 2 + 16, 0, chip, chip, d.colors.home);
    const away = this.add.rectangle(w / 2 - 100, 0, chip, chip, d.colors.away);
    this.score = this.add.text(-w / 2 + 34, 0, '', style).setOrigin(0, 0.5);
    this.clock = this.add.text(w / 2 - 82, 0, '', { ...style, fontSize: '18px' }).setOrigin(0, 0.5);
    this.scoreBox = this.add.container(RENDER.WIDTH / 2, HUD_STYLE.SCORE_Y, [
      bg,
      home,
      away,
      this.score,
      this.clock,
    ]);
  }

  private updateScoreboard(s: SimState): void {
    const m = s.match;
    this.scoreBox?.setVisible(m.enabled);
    if (!m.enabled) return;
    const score = `홈  ${m.scoreHome} : ${m.scoreAway}  원정`;
    if (score !== this.lastScore) {
      this.score?.setText(score);
      this.lastScore = score;
    }
    const clock =
      m.phase === 'inPlay' ||
      m.phase === 'setPiece' ||
      m.phase === 'goalScored' ||
      m.phase === 'outOfPlay'
        ? `${formatMatchClock(m.clock, m.half)} ${phaseLabel(m)}`
        : phaseLabel(m);
    if (clock !== this.lastClock) {
      this.clock?.setText(clock);
      this.lastClock = clock;
    }
  }

  /** 미니맵 바탕(경기장 선): 한 번만 그린다 */
  private createMinimap(): void {
    const k = HUD_STYLE.MINIMAP_SCALE;
    const w = PITCH.LENGTH * k;
    const h = PITCH.WIDTH * k;
    this.mapX = RENDER.WIDTH / 2;
    this.mapY = RENDER.HEIGHT - HUD_STYLE.MINIMAP_MARGIN_BOTTOM - h / 2;
    const g = this.add.graphics();
    g.fillStyle(HUD_STYLE.MINIMAP_BG, HUD_STYLE.MINIMAP_BG_ALPHA);
    g.fillRect(this.mapX - w / 2, this.mapY - h / 2, w, h);
    g.lineStyle(1, HUD_STYLE.MINIMAP_LINE, HUD_STYLE.MINIMAP_LINE_ALPHA);
    g.strokeRect(this.mapX - w / 2, this.mapY - h / 2, w, h);
    g.lineBetween(this.mapX, this.mapY - h / 2, this.mapX, this.mapY + h / 2);
    g.strokeCircle(this.mapX, this.mapY, PITCH.CIRCLE_RADIUS * k);
    for (const sx of [-1, 1]) {
      g.strokeRect(
        this.mapX + (sx > 0 ? w / 2 - PITCH.PENALTY_AREA_DEPTH * k : -w / 2),
        this.mapY - (PITCH.PENALTY_AREA_WIDTH / 2) * k,
        PITCH.PENALTY_AREA_DEPTH * k,
        PITCH.PENALTY_AREA_WIDTH * k,
      );
    }
    this.dots = this.add.graphics();
  }

  /** 선수·공 점: 매 프레임 다시 그린다 */
  private drawDots(s: SimState, d: HudData): void {
    const g = this.dots;
    if (!g) return;
    g.clear();
    const k = HUD_STYLE.MINIMAP_SCALE;
    const me = d.getControlledId();
    for (const p of s.players) {
      const x = this.mapX + p.x * k;
      const y = this.mapY + p.y * k;
      g.fillStyle(p.team === TEAM_HOME ? d.colors.home : d.colors.away, 1);
      g.fillCircle(x, y, HUD_STYLE.MINIMAP_DOT);
      if (p.id === me) {
        g.lineStyle(1.5, 0xffffff, 1);
        g.strokeCircle(x, y, HUD_STYLE.MINIMAP_DOT + 2);
      }
    }
    g.fillStyle(HUD_STYLE.MINIMAP_BALL, 1);
    g.fillCircle(this.mapX + s.ball.x * k, this.mapY + s.ball.y * k, HUD_STYLE.MINIMAP_BALL_DOT);
  }
}
