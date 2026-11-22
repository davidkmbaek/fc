import Phaser from 'phaser';
import { DEBUG } from '../config';

export const DEBUG_OVERLAY_KEY = 'DebugOverlay';

/** 오버레이가 매 갱신마다 읽어 가는 값 */
export interface DebugInfo {
  fps: number;
  /** 스텝 1회 평균 처리 시간 (ms) */
  stepMs: number;
  tick: number;
  simTime: number;
  timeScale: number;
  paused: boolean;
}

export interface DebugOverlayData {
  getInfo: () => DebugInfo;
}

const HELP = '`: 오버레이  P: 일시정지  N: 한 스텝  [ ]: 배속';

/**
 * 디버그 오버레이 (HUD 씬). 경기 카메라의 확대·이동과 무관하게 화면 왼쪽 위에 고정된다.
 * 읽기만 하고 시뮬레이션 상태를 바꾸지 않는다.
 */
export class DebugOverlayScene extends Phaser.Scene {
  private text?: Phaser.GameObjects.Text;
  private getInfo?: () => DebugInfo;
  private sinceRefresh = 0;

  constructor() {
    super(DEBUG_OVERLAY_KEY);
  }

  init(data: DebugOverlayData): void {
    this.getInfo = data.getInfo;
  }

  create(): void {
    this.text = this.add
      .text(DEBUG.OVERLAY_PADDING, DEBUG.OVERLAY_PADDING, '', {
        fontFamily: 'monospace',
        fontSize: DEBUG.OVERLAY_FONT_SIZE,
        color: DEBUG.OVERLAY_COLOR,
        backgroundColor: DEBUG.OVERLAY_BACKGROUND,
        padding: { x: DEBUG.OVERLAY_PADDING, y: DEBUG.OVERLAY_PADDING },
      })
      .setVisible(false);
  }

  toggle(): void {
    if (!this.text) return;
    this.text.setVisible(!this.text.visible);
    this.refresh();
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.text?.visible) return;
    this.sinceRefresh += deltaMs / 1000;
    if (this.sinceRefresh >= DEBUG.OVERLAY_REFRESH) this.refresh();
  }

  private refresh(): void {
    this.sinceRefresh = 0;
    if (!this.text || !this.getInfo) return;
    const i = this.getInfo();
    this.text.setText([
      `FPS    ${i.fps.toFixed(1)}`,
      `step   ${i.stepMs.toFixed(3)} ms`,
      `tick   ${i.tick}`,
      `time   ${i.simTime.toFixed(2)} s`,
      `speed  ${i.timeScale}×  ${i.paused ? '⏸ PAUSED' : '▶'}`,
      '',
      HELP,
    ]);
  }
}
