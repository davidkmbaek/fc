import Phaser from 'phaser';
import { PLAYER, PLAYER_STYLE, RENDER } from '../config';
import { angleDiff } from '../sim/math/angle';
import { lerp } from '../sim/math/scalar';
import type { PlayerAction, PlayerState, Role } from '../sim/player';
import { TEAM_HOME } from '../sim/rules';
import { mToPx, worldPxX, worldPxY } from './coords';

/** 행동 상태별 모양: 슬라이딩은 앞뒤로 길게, 행동 불가는 반투명, 넘어짐은 더 흐리고 납작하게 */
const ACTION_LOOK: Record<PlayerAction, { scaleX: number; scaleY: number; alpha: number }> = {
  none: { scaleX: 1, scaleY: 1, alpha: 1 },
  slide: { scaleX: 1.4, scaleY: 0.75, alpha: 1 },
  stunned: { scaleX: 1, scaleY: 1, alpha: 0.6 },
  fallen: { scaleX: 1.2, scaleY: 0.8, alpha: 0.4 },
};

/**
 * 선수 한 명: 팀 색 원(몸) + 보는 방향 흰 삼각형 + 그림자. 스프라이트·애니메이션은 5단계.
 * 선수끼리는 y 기준으로 정렬한다 (아래쪽이 앞). DESIGN.md §8
 */
export class PlayerView {
  private readonly shadow: Phaser.GameObjects.Arc;
  private readonly body: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    team: number,
    role: Role,
    private readonly worldHalfWidth: number,
  ) {
    const r = mToPx(PLAYER.RADIUS);
    this.shadow = scene.add
      .circle(0, 0, r, 0x000000, PLAYER_STYLE.SHADOW_ALPHA)
      .setDepth(RENDER.DEPTH.SHADOWS);

    const home = team === TEAM_HOME;
    const color =
      role === 'GK'
        ? home
          ? PLAYER_STYLE.HOME_GK_COLOR
          : PLAYER_STYLE.AWAY_GK_COLOR
        : home
          ? PLAYER_STYLE.HOME_COLOR
          : PLAYER_STYLE.AWAY_COLOR;
    const disc = scene.add
      .circle(0, 0, r, color)
      .setStrokeStyle(PLAYER_STYLE.OUTLINE_PX, PLAYER_STYLE.OUTLINE_COLOR);
    const nose = mToPx(PLAYER_STYLE.NOSE_LENGTH);
    const half = nose * 0.6;
    // 오른쪽(+x)을 향한 삼각형. 컨테이너 회전으로 방향을 맞춘다
    const tri = scene.add.triangle(
      r * 0.45,
      0,
      0,
      -half,
      0,
      half,
      nose,
      0,
      PLAYER_STYLE.NOSE_COLOR,
    );
    this.body = scene.add.container(0, 0, [disc, tri]);
  }

  update(prev: PlayerState, curr: PlayerState, alpha: number): void {
    const x = lerp(prev.x, curr.x, alpha);
    const y = lerp(prev.y, curr.y, alpha);
    const facing = prev.facing + angleDiff(prev.facing, curr.facing) * alpha;
    const off = PLAYER_STYLE.SHADOW_OFFSET;

    this.shadow.setPosition(worldPxX(x + off), worldPxY(y + off));
    const look = ACTION_LOOK[curr.action];
    this.body
      .setPosition(worldPxX(x), worldPxY(y))
      .setRotation(facing)
      .setScale(look.scaleX, look.scaleY)
      .setAlpha(look.alpha)
      .setDepth(RENDER.DEPTH.PLAYERS + (y + this.worldHalfWidth) * PLAYER_STYLE.Y_SORT_SCALE);
  }
}
