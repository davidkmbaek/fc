/** 키 상태를 읽는 쪽이 보는 인터페이스 (테스트에서는 가짜로 대체) */
export interface KeyReader {
  isDown(code: string): boolean;
}

/**
 * DOM 키 상태 추적 (`KeyboardEvent.code` 기준). Phaser 키보드 이벤트는 쓰지 않는다(PROGRESS.md 참고).
 * - 아주 짧게 누른 키도 놓치지 않는다: 시뮬레이션 스텝이 한 번도 읽기 전에 뗀 키는
 *   다음 endStep()까지 눌린 것으로 본다 (Q 톡 누르기, 짧은 패스 탭)
 * - 창이 포커스를 잃으면 모든 키를 뗀 것으로 본다 (키가 눌린 채로 남는 문제 방지)
 * - preventKeys에 있는 키는 브라우저 기본 동작(방향키 스크롤 등)을 막는다
 */
export class KeyboardState implements KeyReader {
  private readonly down = new Set<string>();
  /** 마지막 endStep() 이후 새로 눌린 키 */
  private readonly fresh = new Set<string>();
  /** 스텝이 읽기 전에 떼서 다음 endStep()에 지울 키 */
  private readonly releaseLater = new Set<string>();
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

  /** 시뮬레이션 스텝 하나가 입력을 다 읽은 뒤 호출한다 */
  endStep(): void {
    for (const code of this.releaseLater) this.down.delete(code);
    this.releaseLater.clear();
    this.fresh.clear();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.onBlur();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (isTyping(e.target)) return;
    if (!this.down.has(e.code)) this.fresh.add(e.code);
    this.down.add(e.code);
    this.releaseLater.delete(e.code);
    if (this.prevent.has(e.code)) e.preventDefault();
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (this.fresh.has(e.code)) this.releaseLater.add(e.code);
    else this.down.delete(e.code);
  };

  private readonly onBlur = (): void => {
    this.down.clear();
    this.fresh.clear();
    this.releaseLater.clear();
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
