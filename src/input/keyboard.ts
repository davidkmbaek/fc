/** 키 상태를 읽는 쪽이 보는 인터페이스 (테스트에서는 가짜로 대체) */
export interface KeyReader {
  isDown(code: string): boolean;
}

/**
 * DOM 키 상태 추적 (`KeyboardEvent.code` 기준). Phaser 키보드 이벤트는 쓰지 않는다(PROGRESS.md 참고).
 * - 창이 포커스를 잃으면 모든 키를 뗀 것으로 본다 (키가 눌린 채로 남는 문제 방지)
 * - preventKeys에 있는 키는 브라우저 기본 동작(방향키 스크롤 등)을 막는다
 */
export class KeyboardState implements KeyReader {
  private readonly down = new Set<string>();
  private readonly prevent: ReadonlySet<string>;

  constructor(preventKeys: readonly string[]) {
    this.prevent = new Set(preventKeys);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.down.clear();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (isTyping(e.target)) return;
    this.down.add(e.code);
    if (this.prevent.has(e.code)) e.preventDefault();
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
  };

  private readonly onBlur = (): void => {
    this.down.clear();
  };
}

/** Tweakpane 입력칸 등에 글자를 입력하는 중인가 */
export function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
