import {ItemView, WorkspaceLeaf} from 'obsidian';
import type JugglPlugin from '../main';
import {Juggl} from './visualization';
import type {IDataStore, IJugglStores} from 'juggl-api';
import type {IJugglSettings} from 'juggl-api';
import {JUGGL_VIEW_TYPE} from "juggl-api";

export class JugglView extends ItemView {
     juggl: Juggl;
     constructor(leaf: WorkspaceLeaf, settings: IJugglSettings, plugin: JugglPlugin, initialNodes: string[]) {
       super(leaf);
       // TODO: Maybe make this configurable
       leaf.setPinned(true);
       const coreStore = plugin.coreStores[settings.coreStore];
       const stores: IJugglStores ={
         dataStores: [coreStore as IDataStore].concat(plugin.stores),
         coreStore: coreStore};
       this.juggl = new Juggl(this.containerEl.children[1], plugin, stores, settings, initialNodes);
       this.addChild(this.juggl);
     }

     getDisplayText(): string {
       // TODO: Make this interactive: Either the active workspace or the local graph
       return 'Juggl';
     }

     getViewType(): string {
       return JUGGL_VIEW_TYPE;
     }
}
