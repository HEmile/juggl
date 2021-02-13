import type {IAGMode} from '../interfaces';
import type {EventNames, EventObject, NodeSingular} from 'cytoscape';
import type {AdvancedGraph} from './visualization';
import type {NodeCollection} from 'cytoscape';
import type {Menu} from 'obsidian';
import ToolbarLocal from '../ui/ToolbarLocal.svelte';
import {Component, TFile} from 'obsidian';
import {VizId} from '../interfaces';
import {
  CLASS_ACTIVE_FILE,
  CLASS_CONNECTED_ACTIVE_FILE,
  CLASS_INACTIVE_FILE, CLASS_PINNED, CLASS_PROTECTED,
  VIEWPORT_ANIMATION_TIME,
} from '../constants';
import type {Core} from 'cytoscape';
import type {SvelteComponent} from 'svelte';
import {
  AVSDFGlobalLayout,
  ColaGlobalLayout,
  ConcentricLayout,
  DagreGlobalLayout,
  GridGlobalLayout,
} from './layout-settings';


class EventRec {
    eventName: EventNames;
    selector: string;
    event: any;
}

export class LocalMode extends Component implements IAGMode {
    view;
    viz: Core;
    events: EventRec[] = [];
    windowEvent: any;
    toolbar: SvelteComponent;
    constructor(view: AdvancedGraph) {
      super();
      this.view = view;
    }


    onload() {
      if (this.view.vizReady) {
        this._onLoad();
      } else {
        this.registerEvent(this.view.on('vizReady', (viz) => {
          this._onLoad();
        }));
      }
    }

    _onLoad() {
      this.viz = this.view.viz;
      this.registerCyEvent('tap', 'node', async (e: EventObject) => {
        const id = VizId.fromNode(e.target);
        if (!(id.storeId === 'core')) {
          return;
        }
        const file = this.view.plugin.app.metadataCache.getFirstLinkpathDest(id.id, '');
        if (file) {
          await this.onOpenFile(file);
        }
      });

      // Register on file open event
      this.registerEvent(this.view.workspace.on('file-open', async (file) => {
        if (file) {
          await this.onOpenFile(file);
        }
      }));
    }

    async onOpenFile(file: TFile) {
      if (!this.view.settings.autoAddNodes) {
        return;
      }//
      const name = file.basename;
      const id = new VizId(name, 'core');
      let node: NodeSingular;
      this.viz.startBatch();
      if (this.viz.$id(id.toId()).length === 0) {
        for (const dataStore of this.view.datastores) {
          if (dataStore.storeId() === 'core') {
            const nodeDef = await dataStore.get(id);
            node = this.viz.add(nodeDef);
            break;
          }
        }
      } else {
        node = this.viz.$id(id.toId());
      }
      console.log('Here');
      await this.view.expand(node, false);
      node.addClass(CLASS_ACTIVE_FILE);
      this.viz.nodes()
          .difference(node.closedNeighborhood())
          .remove();
      this.view.onGraphChanged(false);
      this.updateActiveFile(node as NodeSingular);
      this.viz.endBatch();
    }

    registerCyEvent(name: EventNames, selector: string, callback: any) {
      this.events.push({eventName: name, selector: selector, event: callback});
      if (selector) {
        this.viz.on(name, selector, callback);
      } else {
        this.viz.on(name, callback);
      }
    }

    onunload(): void {
      for (const listener of this.events) {
        if (listener.selector) {
          this.viz.off(listener.eventName, listener.selector, listener.event);
        } else {
          this.viz.off(listener.eventName, listener.event);
        }
      }
      this.events = [];
      this.toolbar.$destroy();
    }

    getName(): string {
      return 'local';
    }

    fillMenu(menu: Menu): void {

    }

    createToolbar(element: Element) {
      const view = this.view;
      this.toolbar = new ToolbarLocal({
        target: element,
        props: {
          viz: this.viz,
          fitClick: this.view.fitView.bind(view),
          fdgdClick: () => this.view.setLayout(new ColaGlobalLayout()),
          concentricClick: () => this.view.setLayout(new ConcentricLayout()),
          gridClick: () => this.view.setLayout(new GridGlobalLayout()),
          hierarchyClick: () => this.view.setLayout(new DagreGlobalLayout()),
          workspaceModeClick: () => view.setMode('workspace'),
          filterInput: (handler: InputEvent) => {
            // @ts-ignore
            this.view.searchFilter(handler.target.value);
          },
        },
      });
      // this.view.on('vizReady', (viz) => {
      //   tb.$set({viz: viz});
      //   tb.onSelect.bind(tb)();
      // });
    }

    updateActiveFile(node: NodeCollection) {
      this.viz.elements()
          .removeClass([CLASS_CONNECTED_ACTIVE_FILE, CLASS_ACTIVE_FILE, CLASS_INACTIVE_FILE])
          .difference(node.closedNeighborhood())
          .addClass(CLASS_INACTIVE_FILE);
      node.addClass(CLASS_ACTIVE_FILE);
      node.connectedEdges()
          .addClass(CLASS_CONNECTED_ACTIVE_FILE)
          .connectedNodes()
          .addClass(CLASS_CONNECTED_ACTIVE_FILE)
          .union(node);
      this.viz.one('tap', (e) => {
        e.cy.elements().removeClass(['connected-active-file', 'active-file', 'inactive-file']);
      });
    }
}
