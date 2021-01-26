import {IAdvancedGraphSettings} from './settings';
import {EventRef, Events, ItemView, MarkdownRenderer, Menu, TFile, Vault, Workspace, WorkspaceLeaf} from 'obsidian';
import AdvancedGraphPlugin from './main';
import cytoscape, {
  Collection,
  Core,
  EdgeDefinition,
  EdgeSingular,
  ElementDefinition, LayoutOptions, Layouts,
  NodeCollection,
  NodeDefinition,
  NodeSingular, Singular,
} from 'cytoscape';
import {IDataStore} from './interfaces';
import {GraphStyleSheet} from './stylesheet';
import Timeout = NodeJS.Timeout;

export const AG_VIEW_TYPE = 'advanced_graph_view';
export const MD_VIEW_TYPE = 'markdown';

export const PROP_VAULT = 'SMD_vault';
export const PROP_PATH = 'SMD_path';

export const COSE_LAYOUT = {
  name: 'cose-bilkent',
  ready: function() {
    console.log('ready!');
  },
  stop: function() {
    console.log('stop!');
  },
  // @ts-ignore
  animate: 'end',
  animationDuration: 1000,
  refresh: 20,
  numIter: 5000,
  // @ts-ignore
  nodeRepulsion: 7000,
  // @ts-ignore
  idealEdgeLength: 80,
  // @ts-ignore
  edgeElasticity: 0.45,
  coolingFactor: 0.99,
  nodeDimensionsIncludeLabels: true,
  nestingFactor: 0.1,
  gravity: 0.25,
  tile: true,
};


let VIEW_COUNTER = 0;

export class VizId {
    id: string;
    storeId: string;
    constructor(id: string, storeId: string) {
      this.id = id;
      this.storeId = storeId;
    }

    toString(): string {
      return `${this.storeId}:${this.id}`;
    }

    toId(): string {
      return this.toString();
    }

    static fromId(id: string): VizId {
      const split = id.split(':');
      const storeId = split[0];
      const _id = split.slice(1).join(':');
      return new VizId(_id, storeId);
    }

    static fromNode(node: NodeSingular): VizId {
      return VizId.fromId(node.id());
    }

    static fromNodes(nodes: NodeCollection) : VizId[] {
      return nodes.map((n) => VizId.fromNode(n));
    }

    static toId(id: string, storeId: string) : string {
      return new VizId(id, storeId).toId();
    }
}

export class AdvancedGraphView extends ItemView {
    workspace: Workspace;
    settings: IAdvancedGraphSettings;
    initialNode: string;
    vault: Vault;
    plugin: AdvancedGraphPlugin;
    viz: Core;
    rebuildRelations = true;
    selectName: string = undefined;
    expandedNodes: string[] = [];
    events: Events;
    datastores: IDataStore[];
    activeLayout: Layouts;
    hoverTimeout: Record<string, Timeout> = {};
    pinned: NodeCollection;

    constructor(leaf: WorkspaceLeaf, plugin: AdvancedGraphPlugin, initialNode: string, dataStores: IDataStore[]) {
      super(leaf);
      // TODO: Maybe make this configurable
      leaf.setPinned(true);
      this.settings = plugin.settings;
      this.workspace = this.app.workspace;
      this.initialNode = initialNode;
      this.vault = this.app.vault;
      this.plugin = plugin;
      this.datastores = dataStores;
      this.events = new Events();
    }

    async onOpen() {
      const div = document.createElement('div');
      div.id = 'cy' + VIEW_COUNTER;
      VIEW_COUNTER += 1;
      this.containerEl.children[1].appendChild(div);
      div.setAttr('style', 'height: 100%; width:100%');
      div.setAttr('tabindex', '0');

      const nodes = await this.neighbourhood([new VizId(this.initialNode, 'core')]);

      this.viz = cytoscape({
        container: div,
        elements: nodes,
        minZoom: 8e-1,
        maxZoom: 1.3e1,
      });
      this.viz.dblclick();

      if (this.settings.navigator) {
        const navDiv = document.createElement('div');
        navDiv.id = 'cynav' + VIEW_COUNTER;
        div.children[0].appendChild(navDiv);
        navDiv.addClass('cy-navigator');
        // @ts-ignore
        this.viz.navigator({//
          container: '#cynav' + VIEW_COUNTER,
          viewLiveFramerate: 0, // set false to update graph pan only on drag end; set 0 to do it instantly; set a number (frames per second) to update not more than N times per second
          thumbnailEventFramerate: 10, // max thumbnail's updates per second triggered by graph updates
          thumbnailLiveFramerate: false, // max thumbnail's updates per second. Set false to disable
          dblClickDelay: 200, // milliseconds
          removeCustomContainer: true, // destroy the container specified by user on plugin destroy
          rerenderDelay: 100, // ms to throttle rerender updates to the panzoom for performance
        });
      }

      const nodez = this.viz.nodes();
      const edges = await this.buildEdges(nodez);

      if (this.settings.debug) {
        console.log(nodes);
        console.log(edges);
      }
      this.viz.add(edges);

      nodez.forEach((node) => {
        node.data('degree', node.degree(true));
      });

      const styleSheet = await this.createStylesheet();
      this.viz.style(styleSheet);

      this.activeLayout = this.viz.layout(this.colaLayout()).start();

      console.log('Visualization ready');

      const view = this;

      this.viz.on('tap', 'node', async (e) => {
        console.log('tap');
        const id = VizId.fromNode(e.target);
        if (!(id.storeId === 'core')) {
          return;
        }
        const file = this.app.metadataCache.getFirstLinkpathDest(id.id, '');
        if (file) {
          await this.plugin.openFile(file);
        } else {
          // Create dangling file
          // TODO: Add default folder
          const filename = id.id + '.md';
          const createdFile = await this.vault.create(filename, '');
          await this.plugin.openFile(createdFile);
        }
      });
      this.viz.on('tap', 'edge', async (e) => {

        // TODO: Move to correct spot in the file.
      });
      this.viz.on('dblclick', 'node', async (e) => {
        await this.expand(e.target as NodeSingular);
      });
      this.viz.on('mouseover', 'node', async (e) => {
        e.target.unlock();
        const node = e.target as NodeSingular;
        e.cy.elements()
            .difference(node.closedNeighborhood())
            .addClass('unhover');
        node.addClass('hover')
            .connectedEdges()
            .addClass('connected-hover')
            .connectedNodes()
            .addClass('connected-hover');

        const id = VizId.fromNode(e.target);
        if (id.storeId === 'core') {
          const file = this.plugin.metadata.getFirstLinkpathDest(id.id, '');
          if (file && file.extension === 'md') {
            const content = await view.vault.cachedRead(file);
            this.hoverTimeout[e.target.id()] = setTimeout(async () =>
              await this.popover(content, file.path, e.target, 'advanced-graph-preview-node'),
            500);
          }
        }
      });
      this.viz.on('mouseover', 'edge', async (e) => {
        const edge = e.target as EdgeSingular;
        e.cy.elements()
            .difference(edge.connectedNodes().union(edge))
            .addClass('unhover');
        edge.addClass('hover')
            .connectedNodes()
            .addClass('connected-hover');
        if ('context' in edge.data()) {// && e.originalEvent.metaKey) {
          // TODO resolve SourcePath, can be done using the source file.
          this.hoverTimeout[e.target.id()] = setTimeout(async () =>
          // @ts-ignore
            await this.popover(edge.data()['context'], '', edge, 'advanced-graph-preview-edge'),
          500);
        }
      });
      this.viz.on('mouseout', (e) => {
        if (e.target === e.cy) {
          return;
        }
        const id = e.target.id();
        if (id in this.hoverTimeout) {
          clearTimeout(this.hoverTimeout[id]);
          this.hoverTimeout[id] = undefined;
        }
        e.cy.elements().removeClass(['hover', 'unhover', 'connected-hover']);
        if (this.pinned?.contains(e.target)) {
          e.target.lock();
        }
      });
      this.viz.on('grab', (e) => {
        console.log('grab');
        if (this.activeLayout) {
          this.activeLayout.stop();
        }
      });
      this.viz.on('dragfree', (e) => {
        if (this.activeLayout) {
          this.activeLayout.stop();
        }
        // this.activeLayout = this.viz.layout(this.colaLayout()).start();
        this.activeLayout.start();
        const node = e.target;
        this.activeLayout.one('layoutstop', (e)=> {
          if (!view.pinned || !view.pinned.contains(node)) {
            node.unlock();
          }
        });
        node.lock();
      });
      this.viz.on('cxttap', (e) =>{
        // Thanks Liam for sharing how to do context menus
        const fileMenu = new Menu(); // Creates empty file menu
        if (!(e.target === this.viz) && e.target.group() === 'nodes') {
          const id = VizId.fromNode(e.target);
          if (!(id.storeId === 'core')) {
            return;
          }
          const file = this.app.metadataCache.getFirstLinkpathDest(id.id, '');
          if (!(file === undefined)) {
            // hook for plugins to populate menu with "file-aware" menu items
            this.app.workspace.trigger('file-menu', fileMenu, file, 'my-context-menu', null);
          }
        }
        const selection = view.viz.nodes(':selected');
        if (selection.length > 0) {
          fileMenu.addItem((item) => {
            item.setTitle('Expand selection (E)').setIcon('dot-network')
                .onClick((evt) => {
                  this.expand(view.viz.nodes(':selected'));
                });
          });
          fileMenu.addItem((item) => {
            item.setTitle('Hide selection (H)').setIcon('dot-network')
                .onClick((evt) => {
                  this.removeSelection();
                });
          });
          fileMenu.addItem((item) => {
            item.setTitle('Invert selection (I)').setIcon('dot-network')
                .onClick((evt) => {
                  this.invertSelection();
                });
          });
        }
        fileMenu.addItem((item) =>{
          item.setTitle('Select all (A)').setIcon('dot-network')
              .onClick((evt) => {
                this.viz.elements().select();
              });
        });
        console.log('here1');
        console.log(selection);
        if (selection.length > 0) {
          console.log('selection!');
          fileMenu.addItem((item) => {
            item.setTitle('Select neighbors (N)').setIcon('dot-network')
                .onClick((evt) => {
                  this.selectNeighbourhood();
                });
          });
          if (!view.pinned || selection.difference(view.pinned).length > 0) {
            fileMenu.addItem((item) => {
              item.setTitle('Pin selection (P)').setIcon('filled-pin')
                  .onClick((evt) => {
                    this.pinSelection();
                  });
            });
          }
          if (view.pinned && selection.intersect(view.pinned).length > 0) {
            fileMenu.addItem((item) => {
              item.setTitle('Unpin selection (U)').setIcon('pin')
                  .onClick((evt) => {
                    this.unpinSelection();
                  });
            });
          }
        }
        fileMenu.showAtPosition({x: e.originalEvent.x, y: e.originalEvent.y});
      });

      // Register on file open event
      this.registerEvent(this.workspace.on('file-open', async (file) => {
        if (file && this.settings.autoAddNodes) {
          const name = file.basename;
          const id = new VizId(name, 'core');
          let newNode = false;
          if (this.viz.$id(id.toId()).length === 0) {
            for (const dataStore of this.datastores) {
              if (dataStore.storeId() === 'core') {
                const node = await dataStore.get(id);
                this.viz.startBatch();
                this.viz.add(node);
                const edges = await this.buildEdges(this.viz.$id(id.toId()));
                this.viz.add(edges);
                this.onGraphChanged(false);
                this.viz.endBatch();
                const vizNode = this.viz.$id(id.toId());
                this.restartLayout();
                this.viz.one('layoutready', (e)=> {
                  console.log('Layout ready');
                  e.cy.one('layoutstop', (e) => {
                    // animation.stop();
                    e.cy.animate({
                      fit: {
                        eles: vizNode.closedNeighborhood(),
                        padding: 0,
                      },
                      duration: 500,
                      queue: false,
                    });
                  });
                });
                newNode = true;
                break;
              }
            }
          }
          const node = this.viz.$id(id.toId()) as NodeSingular;
          this.viz.elements()
              .removeClass(['connected-active-file', 'active-file', 'inactive-file'])
              .difference(node.closedNeighborhood())
              .addClass('inactive-file');
          node.addClass('active-file');
          const neighbourhood = node.connectedEdges()
              .addClass('connected-active-file')
              .connectedNodes()
              .addClass('connected-active-file')
              .union(node);
          if (!newNode) {
            // If not a new node, start animating immediately
            this.viz.animate({
              fit: {
                eles: neighbourhood,
                padding: 0,
              },
              duration: 500,
              queue: false,
            });
          }
          // this.viz.fit(neighbourhood);
          this.viz.one('tap', (e) => {
            e.cy.elements().removeClass(['connected-active-file', 'active-file', 'inactive-file']);
          });
        }
      }));

      // // Register keypress event
      // Note: Registered on window because it wouldn't fire on the div...
      window.addEventListener('keydown', (evt) => {
        if (!(this.workspace.activeLeaf === this.leaf)) {
          return;
        }
        if (evt.key === 'e') {
          this.expand(view.viz.nodes(':selected'));
        } else if (evt.key === 'h' || evt.key === 'Backspace') {
          this.removeSelection();
        } else if (evt.key === 'i') {
          this.invertSelection();
        } else if (evt.key === 'a') {
          this.viz.elements().select();
        } else if (evt.key === 'n') {
          this.selectNeighbourhood();
        } else if (evt.key === 'p') {
          this.pinSelection();
        } else if (evt.key === 'u') {
          this.unpinSelection();
        }
      }, true);


      // // Note: Nothing is implemented for on('createNode'). Is it true nothing should happen?
      // this.events.push(this.plugin.neo4jStream.on('renameNode', (o, n) => {
      //   this.onNodeRenamed(o, n);
      // }));
      // this.events.push(this.plugin.neo4jStream.on('modifyNode', (name) => {
      //   this.onNodeModify(name);
      // }));
      // this.events.push(this.plugin.neo4jStream.on('deleteNode', (name) => {
      //   this.onNodeDeleted(name);
      // }));
      //
    }

    async popover(mdContent: string, sourcePath: string, target: Singular, styleClass: string) {
      console.log('here');
      const newDiv = document.createElement('div');
      newDiv.addClasses(['popover', 'hover-popover', 'is-loaded', 'advanced-graph-hover']);
      const mdEmbedDiv = document.createElement('div');
      mdEmbedDiv.addClasses(['markdown-embed', styleClass]);
      newDiv.appendChild(mdEmbedDiv);
      const mdEmbedContentDiv = document.createElement('div');
      mdEmbedContentDiv.addClasses(['markdown-embed-content']);
      mdEmbedDiv.appendChild(mdEmbedContentDiv);
      const mdPreviewView = document.createElement('div');
      mdPreviewView.addClasses(['markdown-preview-view']);
      mdEmbedContentDiv.appendChild(mdPreviewView);
      const mdPreviewSection = document.createElement('div');
      mdPreviewSection.addClasses(['markdown-preview-sizer', 'markdown-preview-section']);
      mdPreviewView.appendChild(mdPreviewSection);


      await MarkdownRenderer.renderMarkdown(mdContent, mdPreviewSection, sourcePath, null );

      document.body.appendChild(newDiv);
      // @ts-ignore
      const popper = target.popper({
        content: () => {
          return newDiv;
        },
        popper: {
          placement: 'top',
        }, // my popper options here
      });
      const updatePopper = function() {
        popper.update();
      };
      target.on('position', updatePopper);
      this.viz.on('pan zoom resize', updatePopper);
      newDiv.addEventListener('mouseenter', (e) => {
        newDiv.addClass('popover-hovered');
      });
      newDiv.addEventListener('mouseleave', (e) => {
        popper.destroy();
        newDiv.remove();
      });
      this.viz.one('mouseout', (e) => {
        setTimeout(function() {
          if (!newDiv.hasClass('popover-hovered')) {
            popper.destroy();
            newDiv.remove();
          }
        }, 300);
      });
    }

    async neighbourhood(toExpand: VizId[]) : Promise<NodeDefinition[]> {
      const nodes: NodeDefinition[] = [];
      for (const store of this.datastores) {
        nodes.push(...await store.getNeighbourhood(toExpand));
      }
      return nodes;
    }

    async buildEdges(newNodes: NodeCollection): Promise<EdgeDefinition[]> {
      const edges: EdgeDefinition[] = [];
      for (const store of this.datastores) {
        edges.push(...await store.connectNodes(this.viz.nodes(), VizId.fromNodes(newNodes)));
      }
      return edges;
    }

    async expand(toExpand: NodeCollection) {
      const expandedIds = toExpand.map((n) => VizId.fromNode(n));
      const neighbourhood = await this.neighbourhood(expandedIds);
      this.mergeToGraph(neighbourhood);
      const nodes = this.viz.collection();
      neighbourhood.forEach((n) => {
        nodes.merge(this.viz.$id(n.data.id) as NodeSingular);
      });
      const edges = await this.buildEdges(nodes);
      this.mergeToGraph(edges);
      this.restartLayout();
      this.trigger('expand', toExpand);
    }

    async createStylesheet(): Promise<string> {
      const sheet = new GraphStyleSheet(this);
      this.trigger('stylesheet', sheet);
      return await sheet.getStylesheet();
    }

    protected async onClose(): Promise<void> {
    }

    // updateWithCypher(cypher: string) {
    //   if (this.settings.debug) {
    //     console.log(cypher);
    //   }
    //   // this.viz.updateWithCypher(cypher);
    //   this.rebuildRelations = true;
    // }


    invertSelection() {
      this.viz.$(':selected')
          .unselect()
          .absoluteComplement()
          .select();
    }

    selectNeighbourhood() {
      // TODO: This keeps self-loops selected.
      this.viz.nodes(':selected')
          .unselect()
          .openNeighborhood()
          .select();
    }

    removeSelection() {
      const removed = this.viz.nodes(':selected').remove();
      this.restartLayout();
      this.trigger('hide', removed);
    }

    unpinSelection() {
      const unlocked = this.viz.nodes(':selected').unlock();
      this.restartLayout();
      if (this.pinned) {
        this.pinned = this.pinned.difference(unlocked);
      }
      this.trigger('pin', unlocked);
    }

    pinSelection() {
      const locked = this.viz.nodes(':selected').lock();
      this.restartLayout();
      if (this.pinned) {
        this.pinned = this.pinned.union(locked);
      } else {
        this.pinned = locked;
      }
      this.trigger('pin', locked);
    }


    // public async onNodeModify(name: string) {
    //   if (this.expandedNodes.includes(name)) {
    //     this.updateWithCypher(this.plugin.localNeighborhoodCypher(name));
    //   } else {
    //     this.updateWithCypher(this.plugin.nodeCypher(name));
    //   }
    // }
    //
    // public async onNodeRenamed(oldName: string, newName: string) {
    //   if (this.expandedNodes.includes(oldName)) {
    //     this.updateWithCypher(this.plugin.localNeighborhoodCypher(newName));
    //     this.expandedNodes.remove(oldName);
    //     this.expandedNodes.push(newName);
    //   } else {
    //     this.updateWithCypher(this.plugin.nodeCypher(newName));
    //   }
    // }

    // getInQuery(nodes: IdType[]): string {
    //   let query = 'IN [';
    //   let first = true;
    //   for (const id of nodes) {
    //     // @ts-ignore
    //     const title = this.findNodeRaw(id).properties['name'] as string;
    //     if (!first) {
    //       query += ', ';
    //     }
    //     query += '"' + title + '"';
    //     first = false;
    //   }
    //   query += ']';
    //   return query;
    // }

    colaLayout(): LayoutOptions {
      return {
        name: 'cola',
        // @ts-ignore
        animate: true, // whether to show the layout as it's running
        refresh: 1, // number of ticks per frame; higher is faster but more jerky
        maxSimulationTime: 4000, // max length in ms to run the layout
        ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
        fit: false, // on every layout reposition of nodes, fit the viewport
        padding: 30, // padding around the simulation
        nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node
        // layout event callbacks
        ready: function() {
          console.log('ready!');
        }, // on layoutready
        stop: function() {
          console.log('stop');
          // viz.activeLayout = null;
        }, // on layoutstop
        // positioning options
        randomize: false, // use random node positions at beginning of layout
        avoidOverlap: true, // if true, prevents overlap of node bounding boxes
        handleDisconnected: true, // if true, avoids disconnected components from overlapping
        convergenceThreshold: 0.01, // when the alpha value (system energy) falls below this value, the layout stops
        nodeSpacing: function( node: NodeSingular ) {
          return 10;
        }, // extra spacing around nodes
      };
    }

    restartLayout() {
      if (this.activeLayout) {
        this.activeLayout.stop();
      }
      console.log('starting layout');
      this.activeLayout = this.viz.layout(this.colaLayout()).start();
    }

    mergeToGraph(elements: ElementDefinition[], batch=true) {
      if (batch) {
        this.viz.startBatch();
      }
      const addElements: ElementDefinition[] = [];
      elements.forEach((n) => {
        if (this.viz.$id(n.data.id).length === 0) {
          addElements.push(n);
          console.log('adding', n);
        } else {
          const gElement = this.viz.$id(n.data.id);
          gElement.classes(n.classes);
          gElement.data(n.data);
          console.log('already in', n);
        }
      });
      this.viz.add(addElements);
      this.onGraphChanged(false);
      if (batch) {
        console.log('committing batch');
        this.viz.endBatch();
      }
    }

    onGraphChanged(batch:boolean=true) {
      if (batch) {
        this.viz.startBatch();
      }
      this.viz.nodes().forEach((node) => {
        node.data('degree', node.degree(false));
      });
      if (batch) {
        this.viz.endBatch();
      }
    }

    public getViz(): Core {
      return this.viz;
    }


    getDisplayText(): string {
      return 'Advanced Graph';
    }

    getViewType(): string {
      return AG_VIEW_TYPE;
    }

    on(name:'stylesheet', callback: (sheet: GraphStyleSheet) => any): EventRef;
    on(name: 'expand', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'hide', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'pin', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'unpin', callback: (elements: NodeCollection) => any): EventRef;
    on(name: string, callback: (...data: any) => any, ctx?: any): EventRef {
      return this.events.on(name, callback, ctx);
    }
    off(name: string, callback: (...data: any) => any): void {
      this.events.off(name, callback);
    }
    offref(ref: EventRef): void {
      this.events.offref(ref);
    }
    trigger(name:'stylesheet', sheet: GraphStyleSheet): void;
    trigger(name: 'expand', elements: NodeCollection): void;
    trigger(name: 'hide', elements: NodeCollection): void;
    trigger(name: 'pin', elements: NodeCollection): void;
    trigger(name: 'unpin', elements: NodeCollection): void;
    trigger(name: string, ...data: any[]): void {
      this.events.trigger(name, ...data);
    }
    tryTrigger(evt: EventRef, args: any[]): void {
      this.events.tryTrigger(evt, args);
    }
}
