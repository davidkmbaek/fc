import { AI, FORMATION_5 } from '../../config';
import type { BallState } from '../ball';
import { possessorId } from '../dribble';
import { TEAM_SIZE } from '../formation';
import type { PitchGeometry } from '../pitch';
import type { PlayerState } from '../player';

/** 팀 상태. DESIGN.md §7 (SetPiece는 4.1에서) */
export type TeamMode = 'attack' | 'defend' | 'loose';

/**
 * 팀 모드: 우리 선수가 공을 소유하거나 우리 패스가 날아가는 중이면 attack,
 * 상대가 소유하거나 상대 패스가 날아가는 중이면 defend, 아무도 아니면 loose.
 */
export function teamMode(players: readonly PlayerState[], b: BallState, team: number): TeamMode {
  const target = players[b.passTarget];
  if (target) return target.team === team ? 'attack' : 'defend';
  const owner = players[possessorId(players, b)];
  if (!owner) return 'loose';
  return owner.team === team ? 'attack' : 'defend';
}

/**
 * 홈 위치. DESIGN.md §7 포메이션
 * 포메이션 자리(자기 진영 기준)에서 시작해
 * - 공격 중이면 ATTACK_PUSH만큼 앞으로
 * - 공의 x(공격 방향 기준) × BALL_FOLLOW_X만큼 팀 전체가 앞뒤로
 * - 폭은 공 쪽으로 WIDTH_SQUEEZE만큼 좁힌다
 * 골키퍼는 골문 앞(3.6에서 따로 움직임). out은 재사용 객체.
 */
export function homeSpot(
  p: PlayerState,
  mode: TeamMode,
  b: BallState,
  attackDir: 1 | -1,
  geo: PitchGeometry,
  out: { x: number; y: number },
): { x: number; y: number } {
  const base = FORMATION_5[p.id % TEAM_SIZE];
  if (!base || p.role === 'GK') {
    out.x = -attackDir * (geo.halfLength - 2);
    out.y = 0;
    return out;
  }
  let lx: number = base.x;
  if (mode === 'attack') lx += AI.ATTACK_PUSH;
  lx += b.x * attackDir * AI.BALL_FOLLOW_X;
  const limit = geo.halfLength - AI.HOME_MARGIN_X;
  lx = Math.max(-limit, Math.min(limit, lx));
  out.x = lx * attackDir;
  out.y = base.y * (1 - AI.WIDTH_SQUEEZE) + b.y * AI.WIDTH_SQUEEZE;
  return out;
}
