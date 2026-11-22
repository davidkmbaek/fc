import { PLAYER } from '../config';
import type { PlayerState } from './player';

/**
 * 선수끼리 원 충돌: 겹치면 반씩 밀어낸다. DESIGN.md §4
 * 서로 다가오던 중에 부딪히면 공을 가진 선수(ownerId)는 잠깐 느려진다.
 * 10명 기준 45쌍이라 단순 이중 루프로 충분하다.
 */
export function collidePlayers(players: readonly PlayerState[], ownerId: number): void {
  const minD = PLAYER.RADIUS * 2;
  for (let i = 0; i < players.length; i++) {
    const a = players[i];
    if (!a) continue;
    for (let j = i + 1; j < players.length; j++) {
      const b = players[j];
      if (!b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;
      if (distSq >= minD * minD) continue;

      const dist = Math.sqrt(distSq);
      // 정확히 겹치면 id 순서로 x축 방향으로 떼어 놓는다 (결정적)
      const nx = dist > 1e-9 ? dx / dist : 1;
      const ny = dist > 1e-9 ? dy / dist : 0;
      const push = (minD - dist) / 2;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;

      const approaching = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny < 0;
      if (!approaching) continue;
      if (a.id === ownerId) a.speed *= PLAYER.BUMP_SPEED_FACTOR;
      if (b.id === ownerId) b.speed *= PLAYER.BUMP_SPEED_FACTOR;
    }
  }
}
