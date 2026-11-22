import Phaser from 'phaser';
import { PLAYER, PLAYER_STYLE, RENDER } from '../config';
import { angleDiff } from '../sim/math/angle';
import { lerp } from '../sim/math/scalar';
import type { PlayerState } from '../sim/player';
import { TEAM_HOME } from '../sim/rules';
import { mToPx, worldPxX, worldPxY } from './coords';

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
    private readonly worldHalfWidth: number,
  ) {
    const r = mToPx(PLAYER.RADIUS);
    this.shadow = scene.add
      .circle(0, 0, r, 0x000000, PLAYER_STYLE.SHADOW_ALPHA)
      .setDepth(RENDER.DEPTH.SHADOWS);

    const color = team === TEAM_HOME ? PLAYER_STYLE.HOME_COLOR : PLAYER_STYLE.AWAY_COLOR;
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
    this.body
      .setPosition(worldPxX(x), worldPxY(y))
      .setRotation(facing)
      .setDepth(RENDER.DEPTH.PLAYERS + (y + this.worldHalfWidth) * PLAYER_STYLE.Y_SORT_SCALE);
  }
}
