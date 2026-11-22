import { MATCH } from '../config';
import { createBall } from './ball';
import { homeSpot } from './ai/teamState';
import { formationSpot, TEAM_SIZE } from './formation';
import type { PitchGeometry } from './pitch';
import type { PlayerState } from './player';
import { attackDir } from './rules';
import type { MatchState, RestartKind } from './state';

/**
 * 재시작 지점. DESIGN.md §6
 * - 킥오프: 센터 스폿
 * - 스로인: 나간 지점의 터치라인
 * - 코너킥: 나간 쪽 코너 (endSide = 공이 나간 골라인 쪽 x 부호)
 * - 골킥: 그 골문 골 에어리어 앞 가운데
 */
export function restartSpot(
  kind: RestartKind,
  endSide: number,
  outX: number,
  outY: number,
  geo: PitchGeometry,
  out: { x: number; y: number },
): { x: number; y: number } {
  const sy = outY < 0 ? -1 : 1;
  switch (kind) {
    case 'kickOff':
      out.x = 0;
      out.y = 0;
      break;
    case 'throwIn':
      out.x = Math.max(-geo.halfLength + 1, Math.min(geo.halfLength - 1, outX));
      out.y = sy * geo.halfWidth;
      break;
    case 'cornerKick':
      out.x = endSide * (geo.halfLength - 0.5);
      out.y = sy * (geo.halfWidth - 0.5);
      break;
    case 'goalKick':
      out.x = endSide * geo.goalAreaX;
      out.y = 0;
      break;
  }
  return out;
}

/** 킥(던지기) 방향: 경기장 안쪽 (단위 벡터) */
function kickDir(kind: RestartKind, team: number, m: MatchState, homeAttackDir: 1 | -1) {
  switch (kind) {
    case 'kickOff':
      return { x: attackDir(team, homeAttackDir), y: 0 };
    case 'throwIn':
      return { x: 0, y: m.restartY < 0 ? 1 : -1 };
    case 'cornerKick': {
      const d = Math.hypot(m.restartX, m.restartY) || 1;
      return { x: -m.restartX / d, y: -m.restartY / d };
    }
    case 'goalKick':
      return { x: -Math.sign(m.restartX) || 1, y: 0 };
  }
}

/** 키커: 킥오프 = 공격수, 골킥 = 골키퍼, 그 밖 = 공에 가장 가까운 필드 선수 */
export function pickTaker(
  players: readonly PlayerState[],
  team: number,
  kind: RestartKind,
  x: number,
  y: number,
): number {
  const role = kind === 'kickOff' ? 'FW' : kind === 'goalKick' ? 'GK' : null;
  let best = -1;
  let bestD = Infinity;
  for (const p of players) {
    if (p.team !== team) continue;
    if (role ? p.role !== role : p.role === 'GK') continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) {
      bestD = d;
      best = p.id;
    }
  }
  return best;
}

/** 키커가 설 자리와 바라볼 방향: 공 뒤 TAKER_GAP, 킥 방향을 본다 */
export function takerPose(
  m: MatchState,
  homeAttackDir: 1 | -1,
  out: { x: number; y: number; facing: number },
): { x: number; y: number; facing: number } {
  const u = kickDir(m.restartKind, m.restartTeam, m, homeAttackDir);
  out.x = m.restartX - u.x * MATCH.TAKER_GAP;
  out.y = m.restartY - u.y * MATCH.TAKER_GAP;
  out.facing = Math.atan2(u.y, u.x);
  return out;
}

const probe = createBall();

/**
 * 키커가 아닌 선수의 세트피스 자리.
 * - 킥오프: 포메이션 킥오프 자리(자기 진영)
 * - 그 밖: AI 홈 위치(재시작 팀은 공격, 상대는 수비 기준, 공 = 재시작 지점)
 * 상대 팀은 공에서 OPP_MIN_DIST(스로인은 THROW_MIN_DIST) 밖으로 밀어내고, 경기장 안으로 자른다.
 */
export function setPieceTarget(
  p: PlayerState,
  m: MatchState,
  homeAttackDir: 1 | -1,
  geo: PitchGeometry,
  out: { x: number; y: number },
): { x: number; y: number } {
  const dir = attackDir(p.team, homeAttackDir);
  if (m.restartKind === 'kickOff') {
    const spot = formationSpot(p.id % TEAM_SIZE, dir);
    out.x = spot.x;
    out.y = spot.y;
  } else {
    probe.x = m.restartX;
    probe.y = m.restartY;
    homeSpot(p, p.team === m.restartTeam ? 'attack' : 'defend', probe, dir, geo, out);
  }
  if (p.team !== m.restartTeam) {
    const min = m.restartKind === 'throwIn' ? MATCH.THROW_MIN_DIST : MATCH.OPP_MIN_DIST;
    const dx = out.x - m.restartX;
    const dy = out.y - m.restartY;
    const d = Math.hypot(dx, dy);
    if (d < min) {
      // 공에서 바로 밖으로: 방향이 없으면 자기 골문 쪽으로
      const ux = d > 1e-6 ? dx / d : -dir;
      const uy = d > 1e-6 ? dy / d : 0;
      out.x = m.restartX + ux * min;
      out.y = m.restartY + uy * min;
    }
  }
  out.x = Math.max(-geo.halfLength + 1, Math.min(geo.halfLength - 1, out.x));
  out.y = Math.max(-geo.halfWidth + 1, Math.min(geo.halfWidth - 1, out.y));
  return out;
}
