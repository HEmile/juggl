import {ItemView, WorkspaceLeaf} from 'obsidian';
import type AdvancedGraphPlugin from '../main';
import type {IDataStore} from '../interfaces';
import {AdvancedGraph, AG_VIEW_TYPE} from './visualization';

export class AdvancedGraphView extends ItemView {
     advancedGraph: AdvancedGraph;
     constructor(leaf: WorkspaceLeaf, plugin: AdvancedGraphPlugin, initialNode: string) {
       super(leaf);
       // TODO: Maybe make this configurable
       leaf.setPinned(true);
       const settings = plugin.settings.graphSettings;
       this.advancedGraph = new AdvancedGraph(this.containerEl.children[1], plugin, initialNode,
           [plugin.coreStores[settings.coreStore]].concat(plugin.stores), settings);
       this.addChild(this.advancedGraph);
     }

     getDisplayText(): string {
       return 'Advanced Graph';
     }

     getViewType(): string {
       return AG_VIEW_TYPE;
     }
}
