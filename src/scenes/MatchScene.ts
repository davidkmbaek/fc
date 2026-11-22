import Phaser from 'phaser';
import { DEBUG, DIFFICULTY, KEYS, PLAYER_STYLE, SIM } from '../config';
import { enableBallLauncher } from '../debug/ballLauncher';
import { nextTimeScale } from '../debug/timeScale';
import { bindDevKeys } from '../input/devKeys';
import { HumanSide } from '../input/humanSide';
import { KeyboardState } from '../input/keyboard';
import { BallView } from '../render/BallView';
import { ControlMarker } from '../render/ControlMarker';
import { DebugWorldLayer } from '../render/DebugWorldLayer';
import { MatchCamera } from '../render/MatchCamera';
import { createGoalLayers, createPitchImage } from '../render/PitchRenderer';
import { PlayerView } from '../render/PlayerView';
import { PowerGauge } from '../render/PowerGauge';
import { MatchAi } from '../sim/ai/matchAi';
import { createIntent, type PlayerIntent } from '../sim/intent';
import { FixedStepClock } from '../sim/loop';
import { lerp } from '../sim/math/scalar';
import { TEAM_HOME } from '../sim/rules';
import { nearestPlayerId } from '../sim/selection';
import { Simulation } from '../sim/Simulation';
import { parseScenarioParams } from '../scenarioParams';
import { bannerFor } from '../ui/labels';
import { DEBUG_OVERLAY_KEY, DebugOverlayScene, type DebugInfo } from './DebugOverlayScene';
import { HUD_KEY, HudScene } from './HudScene';

/**
 * 경기 화면. 고정 스텝으로 시뮬레이션을 돌리고, 이전·현재 상태를 보간해서 그린다.
 * 입력은 스텝마다 의도(intent)로 바꿔 시뮬레이션에 넘긴다.
 */
export class MatchScene extends Phaser.Scene {
  private clock!: FixedStepClock;
  private sim!: Simulation;
  private keyboard!: KeyboardState;
  private human!: HumanSide;
  private ai: MatchAi | null = null;
  private intents!: PlayerIntent[];
  private ballView!: BallView;
  private playerViews!: PlayerView[];
  private camera!: MatchCamera;
  private gauge!: PowerGauge;
  private debugWorld!: DebugWorldLayer;
  private marker!: ControlMarker;
  private stepMs = 0;
  /** 직전 프레임의 performance.now() (-1 = 첫 프레임) */
  private lastFrameMs = -1;

  constructor() {
    super('MatchScene');
  }

  create(): void {
    this.clock = new FixedStepClock(SIM.DT, SIM.MAX_STEPS_PER_FRAME);
    const params = parseScenarioParams(window.location.search);
    for (const w of params.warnings) console.warn('[scenario]', w);
    this.sim = new Simulation(SIM.DT, params.seed, params.scenario);
    this.stepMs = 0;
    this.lastFrameMs = -1;

    this.keyboard = new KeyboardState(Object.values(KEYS));
    this.intents = this.sim.curr.players.map(() => createIntent());
    const ball = this.sim.curr.ball;
    const startId = nearestPlayerId(this.sim.curr.players, TEAM_HOME, ball.x, ball.y);
    this.human = new HumanSide(this.keyboard, SIM.DT, TEAM_HOME, startId, this.sim.curr);
    this.ai = this.sim.scenario.ai
      ? new MatchAi(SIM.DT, params.seed, this.sim.geo, [
          DIFFICULTY.normal,
          DIFFICULTY[params.difficulty],
        ])
      : null;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.keyboard.destroy());

    const geo = this.sim.geo;
    createPitchImage(this, geo);
    createGoalLayers(this, geo);
    this.ballView = new BallView(this);
    this.playerViews = this.sim.curr.players.map(
      (p) => new PlayerView(this, p.team, p.role, geo.worldHalfWidth),
    );
    this.gauge = new PowerGauge(this);
    this.debugWorld = new DebugWorldLayer(this);
    this.marker = new ControlMarker(this, this.cameras.main, PLAYER_STYLE.HOME_COLOR);
    this.camera = new MatchCamera(this.cameras.main, geo);
    this.camera.snapTo(this.sim.curr.ball.x, this.sim.curr.ball.y);

    this.scene.launch(HUD_KEY);
    this.setupDebugTools();
    this.pauseOnFocusLoss();

    if (import.meta.env.DEV) {
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
    for (let i = 0; i < steps; i++) {
      this.ai?.update(this.sim.curr, this.intents, this.human.controlledId);
      this.human.beforeStep(this.intents, this.sim.curr);
      this.keyboard.endStep();
      this.sim.step(this.intents);
      this.human.afterStep(this.intents, this.sim.curr);
    }
    if (steps > 0) {
      const perStep = (performance.now() - t0) / steps;
      this.stepMs += (perStep - this.stepMs) * DEBUG.STEP_TIME_SMOOTHING;
    }

    this.draw(this.clock.alpha, realDt);
    this.handleEvents();
  }

  private draw(alpha: number, realDt: number): void {
    const { prev, curr } = this.sim;
    this.ballView.update(prev.ball, curr.ball, alpha);
    this.playerViews.forEach((v, i) => {
      const a = prev.players[i];
      const b = curr.players[i];
      if (a && b) v.update(a, b, alpha);
    });
    const me = curr.players[this.human.controlledId];
    const mePrev = prev.players[this.human.controlledId];
    if (me && mePrev) {
      const mx = lerp(mePrev.x, me.x, alpha);
      const my = lerp(mePrev.y, me.y, alpha);
      this.gauge.update(mx, my, this.human.input.charge);
      this.marker.update(mx, my);
    }
    const overlay = this.scene.get(DEBUG_OVERLAY_KEY);
    this.debugWorld.update(curr, overlay instanceof DebugOverlayScene && overlay.isOpen);

    const bx = lerp(prev.ball.x, curr.ball.x, alpha);
    const by = lerp(prev.ball.y, curr.ball.y, alpha);
    this.camera.follow(bx, by, curr.ball.vx, curr.ball.vy, this.clock.paused ? 0 : realDt);
  }

  /** 시뮬레이션 이벤트를 HUD에 전달 (구독만, 상태는 바꾸지 않음) */
  private handleEvents(): void {
    const hud = this.scene.get(HUD_KEY);
    for (const e of this.sim.drainEvents()) {
      if (e.type === 'ballReset') this.camera.snapTo(this.sim.curr.ball.x, this.sim.curr.ball.y);
      const banner = bannerFor(e);
      if (banner && hud instanceof HudScene) hud.showBanner(banner.text, banner.small);
    }
  }

  private setupDebugTools(): void {
    const getInfo = (): DebugInfo => {
      const b = this.sim.curr.ball;
      const p = this.sim.curr.players[this.human.controlledId];
      return {
        fps: this.game.loop.actualFps,
        stepMs: this.stepMs,
        tick: this.sim.curr.tick,
        simTime: this.sim.curr.time,
        timeScale: this.clock.timeScale,
        paused: this.clock.paused,
        extra: [
          `scene  ${this.sim.scenario.id}  seed ${this.sim.seed}`,
          `match  ${this.sim.curr.match.phase} ${this.sim.curr.match.phase === 'setPiece' ? this.sim.curr.match.restartKind : ''}  ${this.sim.curr.match.scoreHome}:${this.sim.curr.match.scoreAway}  ${this.sim.curr.match.half}H ${this.sim.curr.match.clock.toFixed(0)}s`,
          `ball   x ${b.x.toFixed(2)}  y ${b.y.toFixed(2)}  z ${b.z.toFixed(2)}`,
          `       |v| ${Math.hypot(b.vx, b.vy, b.vz).toFixed(2)} m/s  vz ${b.vz.toFixed(2)}`,
          p
            ? `player x ${p.x.toFixed(2)}  y ${p.y.toFixed(2)}  ${p.speed.toFixed(2)} m/s  ` +
              `${Math.round((p.facing * 180) / Math.PI)}°`
            : '',
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
