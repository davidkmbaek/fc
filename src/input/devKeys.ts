import { isTyping } from './keyboard';

/** 개발·디버그 키 → 명령. DESIGN.md §9 */
export interface DevKeyHandlers {
  toggleOverlay: () => void;
  togglePause: () => void;
  stepOnce: () => void;
  slower: () => void;
  faster: () => void;
}

/**
 * `` ` `` 오버레이, P 일시정지, N 한 스텝(누르고 있으면 반복), `[` `]` 배속.
 *
 * Phaser 키보드 이벤트 대신 DOM `keydown`을 직접 쓴다:
 * - Phaser 4.2.1 KeyboardPlugin은 한 게임 스텝 안에서 큐를 여러 번 처리할 수 있어
 *   keydown과 keyup이 같은 큐에 있으면 같은 keydown이 다시 발생한다(N이 2~4번 실행됨).
 * - `e.code`(물리 키 위치)는 한글 입력 상태에서도 KeyP·KeyN으로 들어온다.
 *
 * 돌려주는 함수를 호출하면 리스너를 해제한다.
 */
export function bindDevKeys(h: DevKeyHandlers): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    if (isTyping(e.target)) return;
    const toggle = (fn: () => void): void => {
      if (!e.repeat) fn();
    };
    switch (e.code) {
      case 'Backquote':
        toggle(h.toggleOverlay);
        break;
      case 'KeyP':
        toggle(h.togglePause);
        break;
      case 'KeyN':
        h.stepOnce();
        break;
      case 'BracketLeft':
        toggle(h.slower);
        break;
      case 'BracketRight':
        toggle(h.faster);
        break;
    }
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
