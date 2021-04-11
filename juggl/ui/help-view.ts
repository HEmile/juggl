import {ItemView, WorkspaceLeaf} from 'obsidian';
import {JUGGL_HELP_VIEW} from '../constants';

export class JugglHelpView extends ItemView {
    frame: HTMLElement = null;

    async onOpen() {
      this.frame = document.createElement('iframe');
      this.frame.addClass(`juggl-site`);
      this.frame.setAttr('style', 'height: 100%; width:100%');
      this.frame.setAttr('src', 'https://juggl.io');
      this.frame.setAttr('tabindex', '0');
      this.containerEl.children[1].appendChild(this.frame);
    }

    getDisplayText(): string {
      return 'Juggl help';
    }

    getViewType(): string {
      return JUGGL_HELP_VIEW;
    }
}
