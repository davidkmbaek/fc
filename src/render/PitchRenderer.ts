import Phaser from 'phaser';
import { PITCH, PITCH_STYLE, RENDER } from '../config';
import type { PitchGeometry } from '../sim/pitch';
import { mToPx, worldPxX, worldPxY } from './coords';

export const PITCH_TEXTURE_KEY = 'pitch';

const SIDES = [-1, 1] as const;

/**
 * 잔디와 라인을 한 번만 그려서 텍스처로 저장하고, 월드 원점에 놓인 Image를 돌려준다.
 * DESIGN.md §8: 경기장은 시작할 때 한 번만 그린다.
 */
export function createPitchImage(
  scene: Phaser.Scene,
  geo: PitchGeometry,
): Phaser.GameObjects.Image {
  const texW = Math.round(mToPx(geo.worldHalfLength * 2));
  const texH = Math.round(mToPx(geo.worldHalfWidth * 2));
  // 텍스처 안 좌표: 월드 왼쪽 위가 (0, 0)
  const tx = (x: number): number => mToPx(x + geo.worldHalfLength);
  const ty = (y: number): number => mToPx(y + geo.worldHalfWidth);

  const g = new Phaser.GameObjects.Graphics(scene);
  drawGrass(g, geo, tx, texH);
  drawLines(g, geo, tx, ty);

  if (scene.textures.exists(PITCH_TEXTURE_KEY)) scene.textures.remove(PITCH_TEXTURE_KEY);
  g.generateTexture(PITCH_TEXTURE_KEY, texW, texH);
  g.destroy();

  return scene.add.image(0, 0, PITCH_TEXTURE_KEY).setDepth(RENDER.DEPTH.PITCH);
}

function drawGrass(
  g: Phaser.GameObjects.Graphics,
  geo: PitchGeometry,
  tx: (x: number) => number,
  texH: number,
): void {
  const sw = PITCH_STYLE.STRIPE_WIDTH;
  // 줄무늬 경계가 골라인(-halfLength)에 맞도록 시작점을 여백 쪽으로 당긴다
  const marginStripes = Math.ceil((geo.worldHalfLength - geo.halfLength) / sw);
  let i = 0;
  for (let x = -geo.halfLength - marginStripes * sw; x < geo.worldHalfLength; x += sw, i++) {
    g.fillStyle(i % 2 === 0 ? PITCH_STYLE.GRASS_LIGHT : PITCH_STYLE.GRASS_DARK, 1);
    g.fillRect(tx(x), 0, mToPx(sw), texH);
  }
}

function drawLines(
  g: Phaser.GameObjects.Graphics,
  geo: PitchGeometry,
  tx: (x: number) => number,
  ty: (y: number) => number,
): void {
  const lw = PITCH.LINE_WIDTH;
  g.lineStyle(mToPx(lw), PITCH_STYLE.LINE_COLOR, 1);
  g.fillStyle(PITCH_STYLE.LINE_COLOR, 1);

  // 터치라인·골라인: 라인 바깥쪽 가장자리가 경기장 경계 (라인은 경기장에 포함)
  g.strokeRect(
    tx(-geo.halfLength + lw / 2),
    ty(-geo.halfWidth + lw / 2),
    mToPx(geo.halfLength * 2 - lw),
    mToPx(geo.halfWidth * 2 - lw),
  );

  // 하프라인, 센터 서클, 센터 스팟
  g.lineBetween(tx(0), ty(-geo.halfWidth), tx(0), ty(geo.halfWidth));
  g.strokeCircle(tx(0), ty(0), mToPx(geo.circleRadius));
  g.fillCircle(tx(0), ty(0), mToPx(PITCH_STYLE.SPOT_RADIUS));

  for (const s of SIDES) {
    strokeBox(g, tx, ty, s * geo.halfLength, s * geo.penaltyAreaX, geo.penaltyAreaHalfWidth);
    strokeBox(g, tx, ty, s * geo.halfLength, s * geo.goalAreaX, geo.goalAreaHalfWidth);

    const spotX = s * geo.penaltySpotX;
    g.fillCircle(tx(spotX), ty(0), mToPx(PITCH_STYLE.SPOT_RADIUS));

    // 페널티 아크: 센터 쪽을 향해 에어리어 밖 부분만
    const toward = s > 0 ? Math.PI : 0;
    g.beginPath();
    g.arc(
      tx(spotX),
      ty(0),
      mToPx(geo.circleRadius),
      toward - geo.penaltyArcHalfAngle,
      toward + geo.penaltyArcHalfAngle,
    );
    g.strokePath();
  }

  // 코너 아크: 각 코너에서 경기장 안쪽으로 90°
  for (const sx of SIDES) {
    for (const sy of SIDES) {
      const inward = Math.atan2(-sy, -sx);
      g.beginPath();
      g.arc(
        tx(sx * geo.halfLength),
        ty(sy * geo.halfWidth),
        mToPx(geo.cornerArcRadius),
        inward - Math.PI / 4,
        inward + Math.PI / 4,
      );
      g.strokePath();
    }
  }
}

/** 골라인 xLine에서 xInner까지, 폭 ±halfWidth인 에어리어 사각형 */
function strokeBox(
  g: Phaser.GameObjects.Graphics,
  tx: (x: number) => number,
  ty: (y: number) => number,
  xLine: number,
  xInner: number,
  halfWidth: number,
): void {
  const x0 = Math.min(xLine, xInner);
  g.strokeRect(tx(x0), ty(-halfWidth), mToPx(Math.abs(xLine - xInner)), mToPx(halfWidth * 2));
}

/**
 * 골대 두 레이어를 월드 좌표에 직접 그린다. 높이 z는 화면 위쪽으로 옮겨 그린다(DESIGN.md §8).
 * 시점이 화면 아래쪽(+y)에서 내려다보는 것으로 보고,
 * - back: 골망 바닥, 먼 쪽 옆그물, 뒷그물 (선수 아래)
 * - front: 지붕 그물, 가까운 쪽 옆그물, 골포스트·크로스바 (선수 위)
 */
export function createGoalLayers(
  scene: Phaser.Scene,
  geo: PitchGeometry,
): { back: Phaser.GameObjects.Graphics; front: Phaser.GameObjects.Graphics } {
  const back = scene.add.graphics().setDepth(RENDER.DEPTH.GOAL_BACK);
  const front = scene.add.graphics().setDepth(RENDER.DEPTH.GOAL_FRONT);
  const gw = geo.goalHalfWidth;
  const h = geo.goalHeight;

  for (const s of SIDES) {
    const xa = worldPxX(s * geo.halfLength);
    const xb = worldPxX(s * (geo.halfLength + geo.goalDepth));
    const left = Math.min(xa, xb);
    const right = Math.max(xa, xb);

    // --- back ---
    back.fillStyle(PITCH_STYLE.NET_COLOR, PITCH_STYLE.NET_FLOOR_ALPHA);
    back.fillRect(left, worldPxY(-gw), right - left, worldPxY(gw) - worldPxY(-gw));
    drawNet(back, left, right, worldPxY(-gw, h), worldPxY(-gw));
    back.lineBetween(xb, worldPxY(-gw, h), xb, worldPxY(gw));

    // --- front ---
    drawNet(front, left, right, worldPxY(-gw, h), worldPxY(gw, h));
    drawNet(front, left, right, worldPxY(gw, h), worldPxY(gw));

    front.lineStyle(mToPx(PITCH.POST_RADIUS * 2), PITCH_STYLE.POST_COLOR, 1);
    front.lineBetween(xa, worldPxY(-gw), xa, worldPxY(-gw, h)); // 먼 포스트
    front.lineBetween(xa, worldPxY(-gw, h), xa, worldPxY(gw, h)); // 크로스바
    front.lineBetween(xa, worldPxY(gw), xa, worldPxY(gw, h)); // 가까운 포스트
  }

  return { back, front };
}

/** 픽셀 사각형 안에 그물 격자를 그린다 */
function drawNet(
  g: Phaser.GameObjects.Graphics,
  left: number,
  right: number,
  top: number,
  bottom: number,
): void {
  const step = mToPx(PITCH_STYLE.NET_MESH);
  g.lineStyle(PITCH_STYLE.NET_LINE_WIDTH_PX, PITCH_STYLE.NET_COLOR, PITCH_STYLE.NET_ALPHA);
  for (let x = left; x <= right + 0.5; x += step) g.lineBetween(x, top, x, bottom);
  for (let y = top; y <= bottom + 0.5; y += step) g.lineBetween(left, y, right, y);
  g.strokeRect(left, top, right - left, bottom - top);
}
