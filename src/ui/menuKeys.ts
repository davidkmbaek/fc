import { isTyping } from '../input/keyboard';

export interface MenuKeyHandlers {
  up: () => void;
  down: () => void;
  left: () => void;
  right: () => void;
  confirm: () => void;
  back: () => void;
}

/**
 * 메뉴용 키 (DOM keydown, e.code). ↑↓ 이동, ←→ 값 바꾸기, Enter·Space·S 확인, Esc 뒤로.
 * 돌려주는 함수를 호출하면 해제한다.
 */
export function bindMenuKeys(h: MenuKeyHandlers): () => void {
  const onKey = (e: KeyboardEvent): void => {
    if (isTyping(e.target) || e.repeat) return;
    const map: Record<string, (() => void) | undefined> = {
      ArrowUp: h.up,
      ArrowDown: h.down,
      ArrowLeft: h.left,
      ArrowRight: h.right,
      Enter: h.confirm,
      Space: h.confirm,
      KeyS: h.confirm,
      Escape: h.back,
    };
    const fn = map[e.code];
    if (!fn) return;
    e.preventDefault();
    fn();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
