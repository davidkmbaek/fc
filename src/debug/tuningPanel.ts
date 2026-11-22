import { Pane } from 'tweakpane';
import { DEBUG, TUNABLES } from '../config';
import type { FixedStepClock } from '../sim/loop';
import { formatTunables } from './configFormat';

/**
 * 개발 빌드 전용 Tweakpane 튜닝 패널. main 번들에 들어가지 않도록
 * 반드시 `if (import.meta.env.DEV)` 안에서 동적 import로만 불러온다.
 */
export function createTuningPanel(clock: FixedStepClock): void {
  const pane = new Pane({ title: '튜닝 (개발 빌드)' });

  const time = pane.addFolder({ title: '시간' });
  time.addBinding(clock, 'timeScale', {
    label: '배속',
    options: Object.fromEntries(DEBUG.TIME_SCALES.map((s) => [`${s}×`, s])),
  });
  time.addBinding(clock, 'paused', { label: '일시정지 (P)' });
  time.addButton({ title: '한 스텝 (N)' }).on('click', () => clock.requestStep());

  for (const [name, section] of Object.entries(TUNABLES)) {
    // 화면을 덜 가리도록 접힌 상태로 시작한다
    const folder = pane.addFolder({ title: name, expanded: false });
    for (const key of Object.keys(section)) folder.addBinding(section, key);
  }

  pane.addButton({ title: '현재 값을 config 형식으로 복사' }).on('click', () => {
    void copyToClipboard(formatTunables(TUNABLES));
  });

  // 키보드(P, [ ])로 바뀐 값을 패널에 반영
  window.setInterval(() => pane.refresh(), DEBUG.PANEL_REFRESH_MS);
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    console.info('[tuning] config 형식으로 복사했습니다:\n' + text);
  } catch {
    console.info('[tuning] 클립보드 복사 실패. 아래를 직접 복사하세요:\n' + text);
  }
}
