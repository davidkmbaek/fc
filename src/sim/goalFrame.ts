import { BALL, GOAL_PHYSICS, PITCH } from '../config';
import type { BallState } from './ball';
import type { PitchGeometry } from './pitch';

const SIDES = [-1, 1] as const;

export type FrameHit = 'post' | 'crossbar' | null;

/**
 * 골포스트(세로 원기둥)와 크로스바(z = 골 높이의 가로 원기둥) 충돌. DESIGN.md §3
 * 겹치면 밀어내고, 다가오는 중이면 법선 방향 속도를 POST_RESTITUTION으로 반사한다.
 * 반사가 일어났으면 'post' 또는 'crossbar'를 돌려준다(효과음·이벤트용).
 */
export function collideGoalFrame(b: BallState, geo: PitchGeometry): FrameHit {
  const minD = PITCH.POST_RADIUS + BALL.RADIUS;
  let hit: FrameHit = null;
  for (const s of SIDES) {
    const gx = s * geo.halfLength;
    if (Math.abs(b.x - gx) > minD) continue;
    if (b.z < geo.goalHeight) {
      if (collideCircle(b, gx, -geo.goalHalfWidth, minD, false)) hit = 'post';
      if (collideCircle(b, gx, geo.goalHalfWidth, minD, false)) hit = 'post';
    }
    if (Math.abs(b.y) <= geo.goalHalfWidth) {
      if (collideCircle(b, gx, geo.goalHeight, minD, true)) hit = 'crossbar';
    }
  }
  return hit;
}

/**
 * 원기둥 단면 원과 공의 충돌. xz=false면 (x, y) 평면(포스트), true면 (x, z) 평면(크로스바).
 * 반사가 일어났으면 true.
 */
function collideCircle(b: BallState, cx: number, c2: number, minD: number, xz: boolean): boolean {
  const dx = b.x - cx;
  const d2v = (xz ? b.z : b.y) - c2;
  const distSq = dx * dx + d2v * d2v;
  if (distSq >= minD * minD) return false;

  const dist = Math.sqrt(distSq);
  // 중심이 정확히 겹치면 필드 쪽(-부호 x)으로 밀어낸다
  const nx = dist > 1e-9 ? dx / dist : -Math.sign(cx) || 1;
  const n2 = dist > 1e-9 ? d2v / dist : 0;
  b.x = cx + nx * minD;
  if (xz) b.z = c2 + n2 * minD;
  else b.y = c2 + n2 * minD;

  const v2 = xz ? b.vz : b.vy;
  const vn = b.vx * nx + v2 * n2;
  if (vn >= 0) return false;
  const j = (1 + GOAL_PHYSICS.POST_RESTITUTION) * vn;
  b.vx -= j * nx;
  if (xz) b.vz -= j * n2;
  else b.vy -= j * n2;
  return true;
}

/**
 * (u = 골 쪽 부호를 곱한 x, y, z)가 골대 상자 안인가
 * (골라인 너머 ~ 뒷그물 앞, 포스트 사이, 크로스바 아래)
 */
function inGoalBox(u: number, y: number, z: number, geo: PitchGeometry): boolean {
  return (
    u > geo.halfLength &&
    u < geo.halfLength + geo.goalDepth &&
    Math.abs(y) < geo.goalHalfWidth &&
    z < geo.goalHeight
  );
}

/**
 * 골망 충돌. (px, py, pz)는 이번 서브스텝 이동 전 위치.
 * - 안에 있던 공: 뒷그물·옆그물·지붕 안쪽에 막히고 속도가 크게 줄어든다. 앞(골 입구)으로는 나갈 수 있다.
 * - 밖에 있던 공: 골 입구가 아닌 면(뒤·옆·지붕)으로는 들어오지 못한다.
 */
export function collideNets(
  b: BallState,
  px: number,
  py: number,
  pz: number,
  geo: PitchGeometry,
): void {
  const r = BALL.RADIUS;
  const back = geo.halfLength + geo.goalDepth;
  const gw = geo.goalHalfWidth;
  const h = geo.goalHeight;

  for (const s of SIDES) {
    const pu = s * px;
    const u = s * b.x;

    if (inGoalBox(pu, py, pz, geo)) {
      if (u <= geo.halfLength) continue; // 골 입구로 다시 나감
      if (u > back - r) {
        b.x = s * (back - r);
        if (s * b.vx > 0) b.vx = -b.vx * GOAL_PHYSICS.NET_RESTITUTION;
        b.vy *= GOAL_PHYSICS.NET_FRICTION;
        b.vz *= GOAL_PHYSICS.NET_FRICTION;
      }
      if (Math.abs(b.y) > gw - r) {
        const sy = Math.sign(b.y);
        b.y = sy * (gw - r);
        if (sy * b.vy > 0) b.vy = -b.vy * GOAL_PHYSICS.NET_RESTITUTION;
        b.vx *= GOAL_PHYSICS.NET_FRICTION;
      }
      if (b.z > h - r) {
        b.z = h - r;
        if (b.vz > 0) b.vz = -b.vz * GOAL_PHYSICS.NET_RESTITUTION;
      }
      continue;
    }

    if (!inGoalBox(u, b.y, b.z, geo)) continue;
    // 밖에서 골대 상자 안으로 들어왔다: 어느 면을 지났는지에 따라 막는다
    const e = GOAL_PHYSICS.NET_OUTSIDE_RESTITUTION;
    if (pu >= back) {
      b.x = s * (back + r);
      b.vx = -b.vx * e;
    } else if (Math.abs(py) >= gw) {
      const sy = Math.sign(py);
      b.y = sy * (gw + r);
      b.vy = -b.vy * e;
    } else if (pz >= h) {
      b.z = h + r;
      b.vz = -b.vz * e;
    }
    // 그 외: 골 입구로 들어옴 (허용)
  }
}
