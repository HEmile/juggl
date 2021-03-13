import {App, FuzzySuggestModal} from 'obsidian';
import * as mdiIcons from '@mdi/js';
import type {Icon} from '../viz/stylesheet';

export class IconModal extends FuzzySuggestModal<Icon> {
  callback: (item: Icon) => any;
  constructor(app: App, callback: (item: Icon) => any) {
    super(app);
    this.callback = callback;
  }
  getItemText(item: Icon): string {
    return item.name;
  }

  getItems(): Icon[] {
    const icons: Icon[] = [{name: 'No icon', path: ''}];
    icons.push(...Object.keys(mdiIcons).map((k) => {
      // @ts-ignore
      return {name: k.slice(3).replace(/([A-Z])/g, ' $1').trim(), path: mdiIcons[k] as string};
    }));
    return icons;
  }

  onChooseItem(item: Icon, evt: MouseEvent | KeyboardEvent): void {
    this.callback(item);
  }
}
