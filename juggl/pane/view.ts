import {App, EventRef, View, WorkspaceLeaf} from 'obsidian';
import {JUGGL_NODES_VIEW_TYPE, JUGGL_STYLE_VIEW_TYPE, JUGGL_VIEW_TYPE} from '../constants';
import type JugglPlugin from '../main';
import type {Juggl} from '../viz/visualization';
import type {JugglView} from '../viz/juggl-view';
import NodesPane from './NodesPane.svelte';
import StylePane from './StylePane.svelte';

export abstract class JugglPane extends View {
    plugin: JugglPlugin;
    activeViz: Juggl = null;
    changeRef: EventRef = null;
    constructor(leaf: WorkspaceLeaf, plugin: JugglPlugin) {
      super(leaf);
      this.plugin = plugin;
      const view = this;
      this.registerEvent(this.plugin.app.workspace.on('active-leaf-change', (leaf) => {
        if (this.changeRef) {
          this.activeViz.offref(this.changeRef);
          this.changeRef = null;
        }
        if (leaf) {
          if (leaf.view.getViewType() === JUGGL_VIEW_TYPE) {
            const activeViz = (leaf.view as JugglView).juggl;
            this.changeRef = activeViz.on('elementsChange', () => {
              view.onActiveVizChange();
            });
            if (activeViz === this.activeViz) {
              return;
            }
            this.activeViz = activeViz;
          } else if (!(leaf.view instanceof JugglPane)) {
            this.activeViz = null;
          }
        } else {
          this.activeViz = null;
        }

        this.onActiveVizChange();
      }));
    }

    abstract onActiveVizChange(): void;

    setViz(viz: Juggl) {
      this.activeViz = viz;
      this.onActiveVizChange();
    }
}

export class JugglNodesPane extends JugglPane {
    pane: NodesPane;
    constructor(leaf: WorkspaceLeaf, plugin: JugglPlugin) {
      super(leaf, plugin);
      this.icon = 'ag-node-list';
    }

    onload() {
      super.onload();
      this.pane = new NodesPane({target: this.containerEl});
    }

    getDisplayText(): string {
      return 'Juggl nodes';
    }

    getViewType(): string {
      return JUGGL_NODES_VIEW_TYPE;
    }

    onActiveVizChange(): void {
      if (this.pane) {
        this.pane.setViz.bind(this.pane)(this.activeViz);
      }
    }
}
export class JugglStylePane extends JugglPane {
    pane: NodesPane;
    constructor(leaf: WorkspaceLeaf, plugin: JugglPlugin) {
      super(leaf, plugin);
      this.icon = 'ag-style';
    }

    onload() {
      super.onload();
      this.pane = new StylePane({target: this.containerEl, props: {
        plugin: this.plugin,
      }});
    }

    getDisplayText(): string {
      return 'Juggl style';
    }

    getViewType(): string {
      return JUGGL_STYLE_VIEW_TYPE;
    }

    onActiveVizChange(): void {
      if (this.pane) {
        this.pane.setViz.bind(this.pane)(this.activeViz);
      }
    }
}
