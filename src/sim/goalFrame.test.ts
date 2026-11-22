import { describe, expect, it } from 'vitest';
import { BALL, PITCH } from '../config';
import { createBall, stepBall } from './ball';
import { collideGoalFrame, collideNets } from './goalFrame';
import { computePitchGeometry } from './pitch';

const geo = computePitchGeometry();
const DT = 1 / 60;
const H = DT / BALL.SUBSTEPS;

/** 서브스텝 단위로 공을 움직이며 골대 충돌만 적용한다 */
function simulate(b: ReturnType<typeof createBall>, seconds: number): string[] {
  const hits: string[] = [];
  for (let i = 0; i < Math.round(seconds / H); i++) {
    const px = b.x;
    const py = b.y;
    const pz = b.z;
    stepBall(b, H);
    const hit = collideGoalFrame(b, geo);
    if (hit) hits.push(hit);
    collideNets(b, px, py, pz, geo);
  }
  return hits;
}

describe('골포스트·크로스바', () => {
  it('골포스트 정면으로 온 땅볼은 튕겨 나온다', () => {
    const b = createBall(45, geo.goalHalfWidth);
    b.vx = 25;
    const hits = simulate(b, 0.5);
    expect(hits).toContain('post');
    expect(b.vx).toBeLessThan(0);
    expect(b.x).toBeLessThan(geo.halfLength);
  });

  it('30 m/s 슛도 골포스트를 뚫지 않는다', () => {
    const b = createBall(40, geo.goalHalfWidth);
    b.vx = 30;
    expect(simulate(b, 0.6)).toContain('post');
    expect(b.vx).toBeLessThan(0);
  });

  it('크로스바 높이로 온 공은 크로스바에 맞고 튕긴다', () => {
    const b = createBall(51, 0);
    b.z = geo.goalHeight;
    b.vx = 20;
    expect(simulate(b, 0.2)).toContain('crossbar');
    expect(b.vx).toBeLessThan(0);
  });

  it('포스트 사이로 온 공은 아무것도 맞지 않는다', () => {
    const b = createBall(45, 0);
    b.vx = 20;
    expect(simulate(b, 0.3)).toEqual([]);
  });

  it('포스트 바깥을 지나가는 공은 맞지 않는다', () => {
    const b = createBall(45, geo.goalHalfWidth + PITCH.POST_RADIUS + BALL.RADIUS + 0.05);
    b.vx = 20;
    expect(simulate(b, 0.3)).toEqual([]);
  });
});

describe('골망', () => {
  it('골 안으로 들어간 30 m/s 슛은 뒷그물에 막혀 골 안에 머문다', () => {
    const b = createBall(40, 0);
    b.z = 1;
    b.vx = 30;
    simulate(b, 3);
    expect(b.x).toBeGreaterThan(geo.halfLength);
    expect(b.x).toBeLessThanOrEqual(geo.halfLength + geo.goalDepth);
    expect(Math.abs(b.y)).toBeLessThan(geo.goalHalfWidth);
  });

  it('뒷그물에 맞으면 속도가 크게 줄어든다', () => {
    const b = createBall(53, 0);
    b.vx = 25;
    simulate(b, 0.2);
    expect(Math.abs(b.vx)).toBeLessThan(5);
  });

  it('골대 뒤에서 오는 공은 뒷그물 바깥에 막혀 골 안으로 들어오지 않는다', () => {
    const b = createBall(57, 0);
    b.vx = -20;
    simulate(b, 0.5);
    expect(b.x).toBeGreaterThan(geo.halfLength + geo.goalDepth);
  });

  it('옆에서 오는 공은 옆그물 바깥에 막힌다', () => {
    const b = createBall(53.5, -8);
    b.vy = 20;
    simulate(b, 0.5);
    expect(b.y).toBeLessThan(-geo.goalHalfWidth);
  });
});
