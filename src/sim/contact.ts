import { DRIBBLE } from '../config';
import { canKick, collideBallWithPlayer, markTouch, tryTouch, tryTrap } from './dribble';
import type { SimEvent } from './events';
import { goalkeeperHands } from './goalkeeping';
import { createIntent, type PlayerIntent } from './intent';
import { executeShot } from './kick';
import { executePass } from './passing';
import type { PitchGeometry } from './pitch';
import { copyKick, type PlayerState } from './player';
import type { Rng } from './rng';
import { attackDir } from './rules';
import type { SimState } from './state';
import { standTackle, startSlide } from './tackle';

export const IDLE_INTENT: Readonly<PlayerIntent> = createIntent();

/** 한 스텝 동안 접촉 처리에 필요한 것들 */
export interface StepContext {
  readonly s: SimState;
  readonly geo: PitchGeometry;
  readonly rng: Rng;
  readonly dt: number;
  readonly events: SimEvent[];
  /** 스로인처럼 패스 거리를 제한할 때 (없으면 기본) */
  passMaxDist?: number;
  /** 스로인: 슛을 던지기(로빙)로 바꾼다 */
  noShots?: boolean;
}

export function ownGoalX(ctx: StepContext, p: PlayerState): number {
  return -attackDir(p.team, ctx.s.homeAttackDir) * ctx.geo.halfLength;
}

export function startTackle(ctx: StepContext, p: PlayerState, intent: PlayerIntent): void {
  const s = ctx.s;
  p.kickBuffer = 0;
  if (intent.tackle === 'stand') {
    pushTackle(ctx, p, 'stand', standTackle(p, s.players, s.ball, ctx.rng, s.time));
  } else {
    startSlide(p, intent.moveX, intent.moveY);
  }
}

export function pushTackle(
  ctx: StepContext,
  p: PlayerState,
  kind: 'stand' | 'slide',
  result: 'won' | 'failed' | 'fall',
): void {
  ctx.events.push({ type: 'tackle', tick: ctx.s.tick, playerId: p.id, kind, result });
}

/**
 * 모든 선수와 공의 접촉: 골키퍼 손 → (든 공이면 배급만) → 킥·받기·터치·몸 충돌.
 * canTouch(p)가 false인 선수는 공과 아무 접촉도 하지 않는다 (세트피스 중 키커 외 등).
 */
export function resolveContacts(
  ctx: StepContext,
  intents: readonly PlayerIntent[],
  canTouch: (p: PlayerState) => boolean,
): void {
  const s = ctx.s;
  for (const p of s.players) {
    if (!canTouch(p)) continue;
    const b = s.ball;
    const save = goalkeeperHands(p, b, ownGoalX(ctx, p), ctx.geo, ctx.rng, s.time);
    if (save) {
      ctx.events.push({ type: 'save', tick: s.tick, playerId: p.id, kind: save });
      continue;
    }
    if (b.heldBy >= 0) {
      // 골키퍼가 든 공: 들고 있는 골키퍼만 배급(킥)할 수 있다
      if (b.heldBy === p.id) distribute(ctx, p, intents[p.id] ?? IDLE_INTENT);
      continue;
    }
    if (p.action === 'none') playerBallContact(ctx, p, intents[p.id] ?? IDLE_INTENT);
    else collideBallWithPlayer(b, p, s.time);
  }
}

/** 골키퍼 배급: 든 공을 내려놓고 킥 의도대로 찬다(던지기·차기) */
function distribute(ctx: StepContext, p: PlayerState, intent: PlayerIntent): void {
  if (!intent.kick) return;
  const b = ctx.s.ball;
  b.heldBy = -1;
  b.z = 0;
  copyKick(p.kick, intent.kick);
  p.kickBuffer = DRIBBLE.KICK_BUFFER;
  playerBallContact(ctx, p, IDLE_INTENT);
}

/** 킥 → 받기·드리블 터치 → 몸 충돌 순으로 선수와 공의 접촉을 처리한다 */
function playerBallContact(ctx: StepContext, p: PlayerState, intent: PlayerIntent): void {
  const s = ctx.s;
  const b = s.ball;
  if (intent.kick) {
    copyKick(p.kick, intent.kick);
    p.kickBuffer = DRIBBLE.KICK_BUFFER;
  }
  if (p.kickBuffer > 0) {
    if (canKick(p, b)) {
      const k = p.kick;
      if (ctx.noShots && k.type === 'shot') k.type = 'lob';
      let targetId = -1;
      if (k.type === 'shot') {
        executeShot(b, p, k, attackDir(p.team, s.homeAttackDir), ctx.geo, ctx.rng);
      } else {
        targetId = executePass(b, p, k, s.players, ctx.geo, ctx.rng, ctx.passMaxDist);
      }
      markTouch(b, p, s.time);
      b.passTarget = targetId;
      p.cooldown = DRIBBLE.KICK_COOLDOWN;
      p.kickBuffer = 0;
      ctx.events.push({
        type: 'kick',
        tick: s.tick,
        playerId: p.id,
        kind: k.type,
        power: k.power,
        targetId,
      });
      return;
    }
    // 이 선수에게 오는 패스라면 공이 도착할 때까지 킥을 들고 있는다 (원터치 패스)
    if (b.passTarget !== p.id || DRIBBLE.ONE_TOUCH_HOLD_FOR_RECEIVER === 0) {
      p.kickBuffer = Math.max(0, p.kickBuffer - ctx.dt);
    }
  } else if (!tryTrap(p, b, s.time)) {
    // 킥을 기다리는 동안에는 받거나 터치하지 않는다 (원터치 킥을 위해, 공이 멀어지지 않게)
    tryTouch(p, intent, b, s.time);
  }
  // 방금 찬(터치한) 선수의 몸은 그 공과 부딪히지 않는다: 뒤로 하는 패스가 자기 몸에 맞지 않게
  if (b.lastTouchPlayer === p.id && p.cooldown > 0) return;
  collideBallWithPlayer(b, p, s.time);
}
