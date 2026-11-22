import { MATCH } from '../config';
import { moveTo, stop } from './ai/steer';
import type { SimEvent } from './events';
import type { PlayerIntent } from './intent';
import type { Crossing } from './lines';
import type { PitchGeometry } from './pitch';
import type { PlayerState } from './player';
import { opponent, restartFor, scoringTeam, TEAM_AWAY, TEAM_HOME } from './rules';
import { pickTaker, restartSpot, setPieceTarget, takerPose } from './setPieces';
import type { MatchPhase, RestartKind, SimState } from './state';

/** 의도를 덮어쓸 때 쓰는 복사 (객체를 새로 만들지 않는다) */
function copyIntent(dst: PlayerIntent, src: PlayerIntent | undefined): void {
  dst.moveX = src?.moveX ?? 0;
  dst.moveY = src?.moveY ?? 0;
  dst.sprint = src?.sprint ?? false;
  dst.kick = src?.kick ?? null;
  dst.tackle = src?.tackle ?? null;
  dst.switchPlayer = src?.switchPlayer ?? false;
}

/**
 * 경기 상태 머신. DESIGN.md §6
 * PreMatch → SetPiece(킥오프) → InPlay → GoalScored(3초) → SetPiece(실점 팀 킥오프)
 * InPlay → OutOfPlay → SetPiece(스로인·코너킥·골킥) → InPlay
 * InPlay(반 시간 끝) → HalfTime → SetPiece(진영 교체, 상대 킥오프) → … → FullTime
 * 상태는 모두 SimState.match에 있어 결정적이다. 세트피스 중에는 선수 의도를 덮어써 자리로 보낸다.
 */
export class MatchDirector {
  private readonly target = { x: 0, y: 0 };
  private readonly pose = { x: 0, y: 0, facing: 0 };
  private readonly spot = { x: 0, y: 0 };

  constructor(
    private readonly geo: PitchGeometry,
    private readonly dt: number,
  ) {}

  /** 스텝 시작: 단계 타이머·시계 진행. 순간이동이 있었으면 true (보간 끊기) */
  beginStep(s: SimState, events: SimEvent[]): boolean {
    const m = s.match;
    const elapsed = s.time - m.phaseStart;
    switch (m.phase) {
      case 'preMatch':
        if (elapsed >= MATCH.PRE_MATCH) {
          events.push({ type: 'whistle', tick: s.tick, kind: 'kickOff', half: m.half });
          this.startRestart(s, 'kickOff', m.firstKickoffTeam, 0, 0, 0);
        }
        return false;
      case 'goalScored':
        if (elapsed >= MATCH.GOAL_CELEBRATION) {
          this.startRestart(s, 'kickOff', m.restartTeam, 0, 0, 0);
          return true;
        }
        return false;
      case 'outOfPlay':
        if (elapsed >= MATCH.OUT_PAUSE) {
          this.startRestart(s, m.restartKind, m.restartTeam, m.restartX, m.restartY, 0);
          return true;
        }
        return false;
      case 'halfTime':
        if (elapsed >= MATCH.HALF_TIME_PAUSE) {
          m.half = 2;
          m.clock = 0;
          s.homeAttackDir = s.homeAttackDir === 1 ? -1 : 1;
          events.push({ type: 'whistle', tick: s.tick, kind: 'kickOff', half: 2 });
          this.startRestart(s, 'kickOff', opponent(m.firstKickoffTeam), 0, 0, 0);
          return true;
        }
        return false;
      case 'inPlay':
        m.clock += this.dt;
        if (m.clock >= MATCH.HALF_SECONDS) {
          m.clock = MATCH.HALF_SECONDS;
          const end = m.half === 1 ? 'halfTime' : 'fullTime';
          events.push({ type: 'whistle', tick: s.tick, kind: end, half: m.half });
          this.setPhase(s, end);
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * 이번 스텝에 실제로 쓸 의도. InPlay면 그대로, 세트피스면 자리로 보내고(키커는 킥만),
   * 그 밖(경기 전·골·아웃·하프타임·종료)에는 모두 멈춘다. 순간이동이 있었으면 true.
   */
  effectiveIntents(s: SimState, src: readonly PlayerIntent[], out: PlayerIntent[]): boolean {
    const m = s.match;
    for (const p of s.players) {
      const o = out[p.id];
      if (o) copyIntent(o, src[p.id]);
    }
    if (m.phase === 'inPlay') return false;
    if (m.phase !== 'setPiece') {
      for (const o of out) this.idle(o);
      return false;
    }
    let teleported = false;
    if (!m.ready) teleported = this.prepare(s, out);
    if (m.ready) {
      for (const p of s.players) {
        const o = out[p.id];
        if (!o) continue;
        const kick = p.id === m.takerId ? o.kick : null;
        this.idle(o);
        o.kick = kick; // 키커는 제자리에서 킥만
      }
    }
    return teleported;
  }

  /** 이 선수가 공을 건드릴 수 있는가: InPlay = 모두, 세트피스 준비 끝 = 키커만, 그 밖 = 아무도 */
  canTouch(s: SimState, p: PlayerState): boolean {
    const m = s.match;
    if (m.phase === 'inPlay') return true;
    return m.phase === 'setPiece' && m.ready && p.id === m.takerId;
  }

  /** 세트피스 동안 공을 재시작 지점에 고정한다 (키커가 차기 전까지). 고정했으면 true */
  lockBall(s: SimState): boolean {
    const m = s.match;
    if (m.phase !== 'setPiece') return false;
    const b = s.ball;
    b.x = m.restartX;
    b.y = m.restartY;
    b.z = 0;
    b.vx = 0;
    b.vy = 0;
    b.vz = 0;
    b.heldBy = -1;
    return true;
  }

  /** 접촉 처리 뒤: 키커가 찼으면 InPlay로 */
  afterContacts(s: SimState, newEvents: readonly SimEvent[]): void {
    const m = s.match;
    if (m.phase !== 'setPiece') return;
    if (newEvents.some((e) => e.type === 'kick' && e.playerId === m.takerId)) {
      this.setPhase(s, 'inPlay');
    }
  }

  /** InPlay 중 공이 라인을 넘었다: 골이면 점수·세리머니, 아웃이면 재시작 준비 */
  onCrossing(s: SimState, c: Crossing, events: SimEvent[]): void {
    const m = s.match;
    if (m.phase !== 'inPlay') return;
    const b = s.ball;
    if (c.kind === 'goal') {
      const team = scoringTeam(c.side, s.homeAttackDir);
      if (team === TEAM_HOME) m.scoreHome++;
      else m.scoreAway++;
      m.restartTeam = opponent(team); // 실점한 팀이 킥오프
      events.push({ type: 'goal', tick: s.tick, side: c.side, team });
      this.setPhase(s, 'goalScored');
      return;
    }
    const r = restartFor(c.line, c.side, b.lastTouchTeam, s.homeAttackDir);
    restartSpot(r.restart, c.side, c.x, c.y, this.geo, this.spot);
    m.restartKind = r.restart;
    m.restartTeam = r.team;
    m.restartX = this.spot.x;
    m.restartY = this.spot.y;
    events.push({ type: 'out', tick: s.tick, ...c, ...r });
    this.setPhase(s, 'outOfPlay');
  }

  private setPhase(s: SimState, phase: MatchPhase): void {
    s.match.phase = phase;
    s.match.phaseStart = s.time;
  }

  private idle(o: PlayerIntent): void {
    stop(o);
    o.kick = null;
    o.tackle = null;
    o.switchPlayer = false;
  }

  /** 세트피스 시작: 재시작 정보, 키커, 공 위치. 공·선수 상태를 정리한다 */
  private startRestart(
    s: SimState,
    kind: RestartKind,
    team: number,
    x: number,
    y: number,
    endSide: number,
  ): void {
    const m = s.match;
    if (kind === 'kickOff') restartSpot(kind, endSide, x, y, this.geo, this.spot);
    else {
      this.spot.x = x;
      this.spot.y = y;
    }
    m.restartKind = kind;
    m.restartTeam = team === TEAM_AWAY ? TEAM_AWAY : TEAM_HOME;
    m.restartX = this.spot.x;
    m.restartY = this.spot.y;
    m.takerId = pickTaker(s.players, m.restartTeam, kind, m.restartX, m.restartY);
    m.ready = false;
    this.setPhase(s, 'setPiece');
    const b = s.ball;
    b.passTarget = -1;
    b.heldBy = -1;
    this.lockBall(s);
    for (const p of s.players) {
      p.action = 'none';
      p.actionTime = 0;
      p.kickBuffer = 0;
      p.cooldown = 0;
    }
    if (kind === 'kickOff') {
      // 킥오프는 바로 자리로 순간이동 (골 뒤·하프타임 뒤 선수들이 흩어져 있으므로)
      for (const p of s.players) this.teleport(s, p);
      m.ready = true;
      m.readyAt = s.time;
    }
  }

  /** 자리로 이동시키고, 모두 도착했거나 SETUP_MAX가 지나면 순간이동해 준비를 끝낸다 */
  private prepare(s: SimState, out: PlayerIntent[]): boolean {
    const m = s.match;
    let allThere = true;
    for (const p of s.players) {
      const o = out[p.id];
      if (!o) continue;
      this.idle(o);
      const t = this.targetFor(s, p);
      if (Math.hypot(t.x - p.x, t.y - p.y) > MATCH.READY_EPS) {
        allThere = false;
        moveTo(o, p, t.x, t.y, true);
      }
    }
    if (!allThere && s.time - m.phaseStart < MATCH.SETUP_MAX) return false;
    for (const p of s.players) this.teleport(s, p);
    m.ready = true;
    m.readyAt = s.time;
    return true;
  }

  private targetFor(s: SimState, p: PlayerState): { x: number; y: number } {
    const m = s.match;
    if (p.id === m.takerId) {
      takerPose(m, s.homeAttackDir, this.pose);
      this.target.x = this.pose.x;
      this.target.y = this.pose.y;
      return this.target;
    }
    return setPieceTarget(p, m, s.homeAttackDir, this.geo, this.target);
  }

  private teleport(s: SimState, p: PlayerState): void {
    const t = this.targetFor(s, p);
    p.x = t.x;
    p.y = t.y;
    p.vx = 0;
    p.vy = 0;
    p.speed = 0;
    if (p.id === s.match.takerId) p.facing = this.pose.facing;
    else p.facing = Math.atan2(s.match.restartY - p.y, s.match.restartX - p.x);
  }
}
