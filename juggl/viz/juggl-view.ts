import {ItemView, WorkspaceLeaf} from 'obsidian';
import type JugglPlugin from '../main';
import {Juggl} from './visualization';
import {JUGGL_VIEW_TYPE} from '../constants';
import type {IDataStore} from '../interfaces';

export class JugglView extends ItemView {
     juggl: Juggl;
     constructor(leaf: WorkspaceLeaf, plugin: JugglPlugin, initialNode: string) {
       super(leaf);
       // TODO: Maybe make this configurable
       leaf.setPinned(true);
       const settings = plugin.settings.graphSettings;
       this.juggl = new Juggl(this.containerEl.children[1], plugin,
           [plugin.coreStores[settings.coreStore] as IDataStore].concat(plugin.stores), settings, initialNode);
       this.addChild(this.juggl);
     }

     getDisplayText(): string {
       return 'Juggl';
     }

     getViewType(): string {
       return JUGGL_VIEW_TYPE;
     }
}
