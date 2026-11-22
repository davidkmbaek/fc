import type Phaser from 'phaser';
import { MENU_STYLE, RENDER } from '../config';
import type { Menu } from '../ui/menu';

/**
 * Menu를 글자 목록으로 그린다. 선택된 항목은 노란색, 클릭하면 선택 + onClick(인덱스).
 * refresh()로 다시 그린다.
 */
export class MenuView {
  private readonly texts: Phaser.GameObjects.Text[];

  constructor(
    scene: Phaser.Scene,
    private readonly menu: Menu,
    y: number,
    onClick: (index: number) => void,
  ) {
    this.texts = menu.items.map((_, i) =>
      scene.add
        .text(RENDER.WIDTH / 2, y + i * MENU_STYLE.ITEM_GAP, '', {
          fontFamily: 'sans-serif',
          fontStyle: 'bold',
          fontSize: MENU_STYLE.ITEM_FONT_SIZE,
          color: MENU_STYLE.COLOR,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          menu.selected = i;
          this.refresh();
          onClick(i);
        }),
    );
    this.refresh();
  }

  refresh(): void {
    this.texts.forEach((t, i) => {
      const sel = i === this.menu.selected;
      t.setText(sel ? `▶ ${this.menu.text(i)}` : this.menu.text(i));
      t.setColor(sel ? MENU_STYLE.SELECTED_COLOR : MENU_STYLE.COLOR);
    });
  }

  setVisible(v: boolean): void {
    for (const t of this.texts) t.setVisible(v);
  }
}
