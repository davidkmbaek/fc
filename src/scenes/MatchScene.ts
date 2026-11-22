import Phaser from 'phaser';
import { RENDER } from '../config';
import { mToPx } from '../render/coords';
import { enableDevCameraControls } from '../render/devCameraControls';
import { createGoalLayers, createPitchImage } from '../render/PitchRenderer';
import { computePitchGeometry } from '../sim/pitch';

/** 경기 화면. 0.2: 경기장과 골대를 그리고 전체가 한 화면에 보이게 한다. */
export class MatchScene extends Phaser.Scene {
  constructor() {
    super('MatchScene');
  }

  create(): void {
    const geo = computePitchGeometry();
    createPitchImage(this, geo);
    createGoalLayers(this, geo);

    // 여백을 포함한 월드 전체가 화면에 들어오는 배율 (경기 카메라는 1.3에서)
    const fitZoom = Math.min(
      RENDER.WIDTH / mToPx(geo.worldHalfLength * 2),
      RENDER.HEIGHT / mToPx(geo.worldHalfWidth * 2),
    );
    this.cameras.main.setZoom(fitZoom).centerOn(0, 0);

    if (import.meta.env.DEV) enableDevCameraControls(this, fitZoom);
  }
}
