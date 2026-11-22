import Phaser from 'phaser';
import { DEBUG, RENDER, SIM } from '../config';
import { enableBallLauncher } from '../debug/ballLauncher';
import { nextTimeScale } from '../debug/timeScale';
import { bindDevKeys } from '../input/devKeys';
import { BallView } from '../render/BallView';
import { mToPx } from '../render/coords';
import { enableDevCameraControls } from '../render/devCameraControls';
import { createGoalLayers, createPitchImage } from '../render/PitchRenderer';
import { FixedStepClock } from '../sim/loop';
import { Simulation } from '../sim/Simulation';
import { bannerFor } from '../ui/labels';
import { DEBUG_OVERLAY_KEY, DebugOverlayScene, type DebugInfo } from './DebugOverlayScene';
import { HUD_KEY, HudScene } from './HudScene';

/**
 * 경기 화면. 고정 스텝으로 시뮬레이션을 돌리고, 이전·현재 상태를 보간해서 그린다.
 */
export class MatchScene extends Phaser.Scene {
  private clock!: FixedStepClock;
  private sim!: Simulation;
  private ballView!: BallView;
  private stepMs = 0;
  /** 직전 프레임의 performance.now() (-1 = 첫 프레임) */
  private lastFrameMs = -1;

  constructor() {
    super('MatchScene');
  }

  create(): void {
    this.clock = new FixedStepClock(SIM.DT, SIM.MAX_STEPS_PER_FRAME);
    this.sim = new Simulation(SIM.DT, SIM.DEFAULT_SEED);
    this.stepMs = 0;
    this.lastFrameMs = -1;

    createPitchImage(this, this.sim.geo);
    createGoalLayers(this, this.sim.geo);
    this.ballView = new BallView(this);

    // 여백을 포함한 월드 전체가 화면에 들어오는 배율 (경기 카메라는 1.3에서)
    const geo = this.sim.geo;
    const fitZoom = Math.min(
      RENDER.WIDTH / mToPx(geo.worldHalfLength * 2),
      RENDER.HEIGHT / mToPx(geo.worldHalfWidth * 2),
    );
    this.cameras.main.setZoom(fitZoom).centerOn(0, 0);

    this.scene.launch(HUD_KEY);
    this.setupDebugTools();
    this.pauseOnFocusLoss();

    if (import.meta.env.DEV) {
      enableDevCameraControls(this, fitZoom);
      enableBallLauncher(this, (x, y, lofted) => this.sim.requestLaunch(x, y, lofted));
      void import('../debug/tuningPanel').then((m) => m.createTuningPanel(this.clock));
    }
  }

  override update(): void {
    // Phaser의 delta는 시작·포커스 복귀 후 120프레임 동안과 포커스가 없을 때 16.7ms로 잘린다.
    // 60 FPS 미만에서 게임이 느려지므로 실제 경과 시간을 직접 잰다(큰 값은 FixedStepClock이 자른다).
    const t0 = performance.now();
    const realDt = this.lastFrameMs < 0 ? 0 : (t0 - this.lastFrameMs) / 1000;
    this.lastFrameMs = t0;
    const steps = this.clock.advance(realDt);
    for (let i = 0; i < steps; i++) this.sim.step();
    if (steps > 0) {
      const perStep = (performance.now() - t0) / steps;
      this.stepMs += (perStep - this.stepMs) * DEBUG.STEP_TIME_SMOOTHING;
    }
    const alpha = this.clock.alpha;
    this.ballView.update(this.sim.prev.ball, this.sim.curr.ball, alpha);
    this.handleEvents();
  }

  /** 시뮬레이션 이벤트를 HUD에 전달 (구독만, 상태는 바꾸지 않음) */
  private handleEvents(): void {
    const hud = this.scene.get(HUD_KEY);
    for (const e of this.sim.drainEvents()) {
      const banner = bannerFor(e);
      if (banner && hud instanceof HudScene) hud.showBanner(banner.text, banner.small);
    }
  }

  private setupDebugTools(): void {
    const getInfo = (): DebugInfo => {
      const b = this.sim.curr.ball;
      return {
        fps: this.game.loop.actualFps,
        stepMs: this.stepMs,
        tick: this.sim.curr.tick,
        simTime: this.sim.curr.time,
        timeScale: this.clock.timeScale,
        paused: this.clock.paused,
        extra: [
          `ball   x ${b.x.toFixed(2)}  y ${b.y.toFixed(2)}  z ${b.z.toFixed(2)}`,
          `       |v| ${Math.hypot(b.vx, b.vy, b.vz).toFixed(2)} m/s  vz ${b.vz.toFixed(2)}`,
        ],
      };
    };
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
