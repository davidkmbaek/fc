import Phaser from 'phaser';
import { MENU_STYLE, RENDER } from '../config';
import { Menu } from '../ui/menu';
import { bindMenuKeys } from '../ui/menuKeys';
import { SCENE_KEYS } from './keys';
import { MenuView } from './menuView';

export interface PauseData {
  resume: () => void;
  restart: () => void;
  title: () => void;
}

/** 일시정지 메뉴: 계속하기 / 다시 시작 / 타이틀로. Esc = 계속하기 */
export class PauseScene extends Phaser.Scene {
  private actions!: PauseData;

  constructor() {
    super(SCENE_KEYS.PAUSE);
  }

  init(data: PauseData): void {
    this.actions = data;
  }

  create(): void {
    this.add
      .rectangle(RENDER.WIDTH / 2, RENDER.HEIGHT / 2, RENDER.WIDTH, RENDER.HEIGHT, 0x000000)
      .setAlpha(MENU_STYLE.PAUSE_DIM_ALPHA);
    this.add
      .text(RENDER.WIDTH / 2, 220, '일시정지', {
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        fontSize: '48px',
        color: MENU_STYLE.COLOR,
      })
      .setOrigin(0.5);
    const menu = new Menu([
      { id: 'resume', label: '계속하기' },
      { id: 'restart', label: '다시 시작' },
      { id: 'title', label: '타이틀로' },
    ]);
    const choose = (): void => {
      const id = menu.current?.id;
      unbind();
      if (id === 'restart') this.actions.restart();
      else if (id === 'title') this.actions.title();
      else this.actions.resume();
    };
    const view = new MenuView(this, menu, MENU_STYLE.ITEMS_Y, choose);
    const unbind = bindMenuKeys({
      up: () => {
        menu.move(-1);
        view.refresh();
      },
      down: () => {
        menu.move(1);
        view.refresh();
      },
      left: () => undefined,
      right: () => undefined,
      confirm: choose,
      back: () => {
        unbind();
        this.actions.resume();
      },
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unbind);
  }
}
