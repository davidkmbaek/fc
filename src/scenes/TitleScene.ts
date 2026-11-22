import Phaser from 'phaser';
import { HOME_COLOR_OPTIONS, MENU_STYLE, RENDER } from '../config';
import { parseScenarioParams } from '../scenarioParams';
import { Menu } from '../ui/menu';
import { bindMenuKeys } from '../ui/menuKeys';
import {
  CONTROLS_HELP,
  DIFFICULTY_NAMES,
  DIFFICULTY_ORDER,
  type MatchStartData,
} from '../ui/settings';
import { SCENE_KEYS } from './keys';
import { MenuView } from './menuView';

/**
 * 타이틀: 경기 시작 / 우리 팀 색 / 난이도 / 조작 방법. DESIGN.md §11 4.4
 * URL에 ?scenario=가 있으면 타이틀을 건너뛰고 바로 경기 화면으로 (개발용).
 */
export class TitleScene extends Phaser.Scene {
  private menu!: Menu;
  private view!: MenuView;
  private help!: Phaser.GameObjects.Text;
  private unbind: (() => void) | null = null;

  constructor() {
    super(SCENE_KEYS.TITLE);
  }

  create(): void {
    const params = parseScenarioParams(window.location.search);
    if (new URLSearchParams(window.location.search).has('scenario')) {
      const data: MatchStartData = { ...params, homeColor: 0 };
      this.scene.start(SCENE_KEYS.MATCH, data);
      return;
    }

    this.cameras.main.setBackgroundColor(MENU_STYLE.BG);
    const textStyle = { fontFamily: 'sans-serif', fontStyle: 'bold', color: MENU_STYLE.COLOR };
    this.add
      .text(RENDER.WIDTH / 2, 150, MENU_STYLE.TITLE, {
        ...textStyle,
        fontSize: MENU_STYLE.TITLE_FONT_SIZE,
      })
      .setOrigin(0.5);
    this.add
      .text(RENDER.WIDTH / 2, 230, MENU_STYLE.SUBTITLE, {
        ...textStyle,
        fontStyle: 'normal',
        fontSize: MENU_STYLE.SUBTITLE_FONT_SIZE,
        color: MENU_STYLE.DIM_COLOR,
      })
      .setOrigin(0.5);

    this.menu = new Menu([
      { id: 'start', label: '경기 시작' },
      {
        id: 'color',
        label: '우리 팀 색',
        options: HOME_COLOR_OPTIONS.map((o) => o.name),
        value: 0,
      },
      {
        id: 'difficulty',
        label: '난이도',
        options: DIFFICULTY_ORDER.map((d) => DIFFICULTY_NAMES[d]),
        value: DIFFICULTY_ORDER.indexOf(params.difficulty),
      },
      { id: 'help', label: '조작 방법' },
    ]);
    this.view = new MenuView(this, this.menu, MENU_STYLE.ITEMS_Y, () => this.confirm());
    this.help = this.add
      .text(
        RENDER.WIDTH / 2,
        MENU_STYLE.ITEMS_Y - 20,
        [...CONTROLS_HELP, '', '(Enter·Esc: 돌아가기)'],
        {
          fontFamily: 'sans-serif',
          fontSize: MENU_STYLE.HELP_FONT_SIZE,
          color: MENU_STYLE.COLOR,
          align: 'center',
          lineSpacing: MENU_STYLE.HELP_LINE_GAP - 22,
        },
      )
      .setOrigin(0.5, 0)
      .setVisible(false);

    this.unbind = bindMenuKeys({
      up: () => this.step(() => this.menu.move(-1)),
      down: () => this.step(() => this.menu.move(1)),
      left: () => this.step(() => this.menu.change(-1)),
      right: () => this.step(() => this.menu.change(1)),
      confirm: () => this.confirm(),
      back: () => this.showHelp(false),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unbind?.());
  }

  private step(fn: () => void): void {
    if (this.help.visible) return;
    fn();
    this.view.refresh();
  }

  private showHelp(v: boolean): void {
    this.help.setVisible(v);
    this.view.setVisible(!v);
  }

  private confirm(): void {
    if (this.help.visible) {
      this.showHelp(false);
      return;
    }
    const id = this.menu.current?.id;
    if (id === 'help') this.showHelp(true);
    else if (id === 'start') {
      const params = parseScenarioParams(window.location.search);
      const data: MatchStartData = {
        scenario: 'match',
        seed: params.seed,
        difficulty: DIFFICULTY_ORDER[this.menu.valueOf('difficulty')] ?? 'normal',
        homeColor: this.menu.valueOf('color'),
      };
      this.scene.start(SCENE_KEYS.MATCH, data);
    } else {
      // 값 고르기 항목에서 확인 = 다음 값
      this.menu.change(1);
      this.view.refresh();
    }
  }
}
