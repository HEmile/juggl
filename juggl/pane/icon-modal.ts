import {App, FuzzyMatch, FuzzySuggestModal} from 'obsidian';
import * as mdiIcons from '@mdi/js';
import type {Icon} from '../viz/stylesheet';
import {pathToSvg} from '../ui/icons';

export class IconModal extends FuzzySuggestModal<Icon> {
  callback: (item: Icon) => any;
  color: string;
  constructor(app: App, callback: (item: Icon) => any, color: string) {
    super(app);
    this.callback = callback;
    this.resultContainerEl.addClass('juggl-icon-picker');
    this.color = color;
  }
  getItemText(item: Icon): string {
    return item.name;
  }

  getItems(): Icon[] {
    const icons: Icon[] = [{name: 'No icon', path: '', color: this.color}];
    icons.push(...Object.keys(mdiIcons).map((k) => {
      return {name: k.slice(3).replace(/([A-Z])/g, ' $1').trim(),
        // @ts-ignore
        path: mdiIcons[k] as string,
        color: this.color};
    }));
    return icons;
  }

  onChooseItem(item: Icon, evt: MouseEvent | KeyboardEvent): void {
    this.callback(item);
  }

  renderSuggestion(item: FuzzyMatch<Icon>, el: HTMLElement) {
    el.empty();

    const iconHtml = pathToSvg(item.item.path);
    //    // const renderedResult = el.createEl('span', {cls: ''});
    const innerResult = el.createEl('span', {
      cls: 'react-icon ',
    });
    innerResult.innerHTML = iconHtml;
    // el.createEl('span', {
    super.renderSuggestion(item, el);
    //   cls: '',
    //   text: item.item.name,
    // });
  }
}
