/**
 * 선수 조종 의도. 사람(입력 계층)과 AI가 같은 형태로 만든다 (CLAUDE.md 규칙 5, DESIGN.md §5).
 * 매 스텝 재사용하므로 객체를 새로 만들지 말고 필드를 덮어쓴다.
 */
export type KickType = 'pass' | 'through' | 'lob' | 'shot';

export interface KickIntent {
  type: KickType;
  /** 0 ~ 1 (버튼을 누른 시간) */
  power: number;
  /** 조준 방향 (크기 0이면 선수가 보는 방향) */
  aimX: number;
  aimY: number;
}

export interface PlayerIntent {
  /** 이동 방향 (크기 0 ~ 1) */
  moveX: number;
  moveY: number;
  sprint: boolean;
  /** 이번 스텝에 실행할 킥 (없으면 null) */
  kick: KickIntent | null;
}

export function createIntent(): PlayerIntent {
  return { moveX: 0, moveY: 0, sprint: false, kick: null };
}
