import Phaser from 'phaser';
import { DEBUG, RENDER, SIM } from '../config';
import { nextTimeScale } from '../debug/timeScale';
import { bindDevKeys } from '../input/devKeys';
import { mToPx, worldPxX, worldPxY } from '../render/coords';
import { enableDevCameraControls } from '../render/devCameraControls';
import { createGoalLayers, createPitchImage } from '../render/PitchRenderer';
import { FixedStepClock } from '../sim/loop';
import { lerp } from '../sim/math/scalar';
import { computePitchGeometry } from '../sim/pitch';
import { Simulation } from '../sim/Simulation';
import { DEBUG_OVERLAY_KEY, DebugOverlayScene, type DebugInfo } from './DebugOverlayScene';

/**
 * 경기 화면. 고정 스텝으로 시뮬레이션을 돌리고, 이전·현재 상태를 보간해서 그린다.
 * 0.4: 시뮬레이션에는 보간 확인용 임시 점만 있다.
 */
export class MatchScene extends Phaser.Scene {
  private clock!: FixedStepClock;
  private sim!: Simulation;
  private probe!: Phaser.GameObjects.Arc;
  private stepMs = 0;

  constructor() {
    super('MatchScene');
  }

  create(): void {
    this.clock = new FixedStepClock(SIM.DT, SIM.MAX_STEPS_PER_FRAME);
    this.sim = new Simulation(SIM.DT, SIM.DEFAULT_SEED);
    this.stepMs = 0;

    const geo = computePitchGeometry();
    createPitchImage(this, geo);
    createGoalLayers(this, geo);
    this.probe = this.add
      .circle(0, 0, mToPx(DEBUG.PROBE_RADIUS), DEBUG.PROBE_COLOR)
      .setDepth(RENDER.DEPTH.ENTITIES);

    // 여백을 포함한 월드 전체가 화면에 들어오는 배율 (경기 카메라는 1.3에서)
    const fitZoom = Math.min(
      RENDER.WIDTH / mToPx(geo.worldHalfLength * 2),
      RENDER.HEIGHT / mToPx(geo.worldHalfWidth * 2),
    );
    this.cameras.main.setZoom(fitZoom).centerOn(0, 0);

    this.setupDebugTools();
    this.pauseOnFocusLoss();

    if (import.meta.env.DEV) {
      enableDevCameraControls(this, fitZoom);
      void import('../debug/tuningPanel').then((m) => m.createTuningPanel(this.clock));
    }
  }

  override update(_time: number, deltaMs: number): void {
    const t0 = performance.now();
    const steps = this.clock.advance(deltaMs / 1000);
    for (let i = 0; i < steps; i++) this.sim.step();
    if (steps > 0) {
      const perStep = (performance.now() - t0) / steps;
      this.stepMs += (perStep - this.stepMs) * DEBUG.STEP_TIME_SMOOTHING;
    }
    this.draw(this.clock.alpha);
  }

  private draw(alpha: number): void {
    const a = this.sim.prev.probe;
    const b = this.sim.curr.probe;
    this.probe.setPosition(worldPxX(lerp(a.x, b.x, alpha)), worldPxY(lerp(a.y, b.y, alpha)));
  }

  private setupDebugTools(): void {
    const getInfo = (): DebugInfo => ({
      fps: this.game.loop.actualFps,
      stepMs: this.stepMs,
      tick: this.sim.curr.tick,
      simTime: this.sim.curr.time,
      timeScale: this.clock.timeScale,
      paused: this.clock.paused,
    });
    this.scene.launch(DEBUG_OVERLAY_KEY, { getInfo });

    const unbind = bindDevKeys({
      toggleOverlay: () => {
        const overlay = this.scene.get(DEBUG_OVERLAY_KEY);
        if (overlay instanceof DebugOverlayScene) overlay.toggle();
      },
      togglePause: () => {
        this.clock.paused = !this.clock.paused;
      },
      stepOnce: () => this.clock.requestStep(),
      slower: () => {
        this.clock.timeScale = nextTimeScale(this.clock.timeScale, -1, DEBUG.TIME_SCALES);
      },
      faster: () => {
        this.clock.timeScale = nextTimeScale(this.clock.timeScale, 1, DEBUG.TIME_SCALES);
      },
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unbind);
  }

  /** 창이 포커스를 잃거나 탭이 가려지면 일시정지 (CLAUDE.md "탭 전환") */
  private pauseOnFocusLoss(): void {
    const pause = (): void => {
      this.clock.paused = true;
    };
    this.game.events.on(Phaser.Core.Events.BLUR, pause);
    this.game.events.on(Phaser.Core.Events.HIDDEN, pause);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, pause);
      this.game.events.off(Phaser.Core.Events.HIDDEN, pause);
    });
  }
}
