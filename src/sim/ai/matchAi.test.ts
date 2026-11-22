import { describe, expect, it } from 'vitest';
import { AI, HEADLESS } from '../../config';
import { createBall } from '../ball';
import { runHeadlessMatch } from '../headless';
import { computePitchGeometry } from '../pitch';
import { createPlayer } from '../player';
import { homeSpot, teamMode } from './teamState';

const geo = computePitchGeometry();

describe('teamMode', () => {
  const players = [createPlayer(0, 0, 0, 0), createPlayer(1, 1, 10, 0)];

  it('소유자 팀은 attack, 상대는 defend, 아무도 없으면 loose', () => {
    const b = createBall(0.5, 0);
    b.lastTouchPlayer = 0;
    expect(teamMode(players, b, 0)).toBe('attack');
    expect(teamMode(players, b, 1)).toBe('defend');
    const loose = createBall(30, 0);
    expect(teamMode(players, loose, 0)).toBe('loose');
  });

  it('패스가 날아가는 중이면 받을 선수의 팀이 attack', () => {
    const b = createBall(5, 0);
    b.passTarget = 1;
    expect(teamMode(players, b, 1)).toBe('attack');
    expect(teamMode(players, b, 0)).toBe('defend');
  });
});

describe('homeSpot', () => {
  const out = { x: 0, y: 0 };
  const mf = createPlayer(3, 0, 0, 0, 0, 'MF'); // 포메이션 3번(MF, x = -18)

  it('공격 중이면 ATTACK_PUSH만큼 앞으로', () => {
    const b = createBall(0, 0);
    const def = homeSpot(mf, 'defend', b, 1, geo, { x: 0, y: 0 }).x;
    const att = homeSpot(mf, 'attack', b, 1, geo, out).x;
    expect(att - def).toBeCloseTo(AI.ATTACK_PUSH);
  });

  it('공의 x를 따라 팀이 앞뒤로 움직이고, 반대 방향 팀은 x가 뒤집힌다', () => {
    const b = createBall(20, 0);
    expect(homeSpot(mf, 'defend', b, 1, geo, out).x).toBeCloseTo(-18 + 20 * AI.BALL_FOLLOW_X);
    const away = createPlayer(8, 1, 0, 0, 0, 'MF');
    expect(homeSpot(away, 'defend', b, -1, geo, out).x).toBeCloseTo(18 + 20 * AI.BALL_FOLLOW_X);
  });

  it('골키퍼는 자기 골문 앞', () => {
    const gk = createPlayer(0, 0, 0, 0, 0, 'GK');
    expect(homeSpot(gk, 'attack', createBall(40, 0), 1, geo, out).x).toBeLessThan(-48);
  });
});

describe('AI 대 AI (헤드리스)', () => {
  it('정식 경기: 오류·정체 없이 양 팀 모두 패스하고 공을 소유한다', () => {
    const r = runHeadlessMatch(11);
    expect(r.errors).toEqual([]);
    expect(r.longestIdle).toBeLessThan(HEADLESS.STALL_SECONDS);
    expect(r.passes[0]).toBeGreaterThan(3);
    expect(r.passes[1]).toBeGreaterThan(3);
    expect(r.possession[0]).toBeGreaterThan(0.2);
    expect(r.possession[1]).toBeGreaterThan(0.2);
  }, 20_000); // 정식 경기 한 판은 무겁다

  it('결정성: 같은 시드면 같은 결과', () => {
    expect(runHeadlessMatch(5, 30)).toEqual(runHeadlessMatch(5, 30));
  });
});
