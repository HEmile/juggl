import {ItemView, WorkspaceLeaf} from 'obsidian';
import type AdvancedGraphPlugin from '../main';
import {AdvancedGraph} from './visualization';
import {AG_VIEW_TYPE} from '../constants';
import type {IDataStore} from '../interfaces';

export class AdvancedGraphView extends ItemView {
     advancedGraph: AdvancedGraph;
     constructor(leaf: WorkspaceLeaf, plugin: AdvancedGraphPlugin, initialNode: string) {
       super(leaf);
       // TODO: Maybe make this configurable
       leaf.setPinned(true);
       const settings = plugin.settings.graphSettings;
       this.advancedGraph = new AdvancedGraph(this.containerEl.children[1], plugin,
           [plugin.coreStores[settings.coreStore] as IDataStore].concat(plugin.stores), settings, initialNode);
       this.addChild(this.advancedGraph);
     }

     getDisplayText(): string {
       return 'Advanced Graph';
     }

     getViewType(): string {
       return AG_VIEW_TYPE;
     }
}
