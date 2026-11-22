/**
 * 메뉴 상태 (Phaser 없이 테스트할 수 있는 순수 모델).
 * 항목은 '실행' 항목(label만)과 '값 고르기' 항목(options, ←→로 바꿈)이 있다.
 */
export interface MenuItem {
  id: string;
  label: string;
  /** 값 고르기 항목의 선택지 이름 (없으면 실행 항목) */
  options?: readonly string[];
  value?: number;
}

export class Menu {
  selected = 0;

  constructor(readonly items: MenuItem[]) {}

  /** 위(-1)·아래(+1)로 이동, 끝에서 반대쪽으로 돈다 */
  move(dir: 1 | -1): void {
    const n = this.items.length;
    this.selected = (this.selected + dir + n) % n;
  }

  /** 선택된 값 고르기 항목의 값을 바꾼다 (끝에서 돈다). 실행 항목이면 아무 일 없음 */
  change(dir: 1 | -1): void {
    const item = this.items[this.selected];
    if (!item?.options) return;
    const n = item.options.length;
    item.value = ((item.value ?? 0) + dir + n) % n;
  }

  get current(): MenuItem | undefined {
    return this.items[this.selected];
  }

  /** 화면에 보일 문구: "이름: < 값 >" 또는 "이름" */
  text(i: number): string {
    const item = this.items[i];
    if (!item) return '';
    if (!item.options) return item.label;
    return `${item.label}:  ◀ ${item.options[item.value ?? 0] ?? ''} ▶`;
  }

  valueOf(id: string): number {
    return this.items.find((it) => it.id === id)?.value ?? 0;
  }
}
