import type {IAdvancedGraphSettings} from '../settings';
import {EventRef, Events, ItemView, MarkdownRenderer, Menu, TFile, Vault, Workspace, WorkspaceLeaf} from 'obsidian';
import type AdvancedGraphPlugin from '../main';
import cytoscape, {
  Collection,
  Core,
  EdgeDefinition,
  EdgeSingular,
  ElementDefinition, EventObject, LayoutOptions, Layouts,
  NodeCollection,
  NodeDefinition,
  NodeSingular, Singular,
} from 'cytoscape';
import type {IAGMode, IDataStore} from '../interfaces';
import {GraphStyleSheet} from './stylesheet';
import Timeout = NodeJS.Timeout;

import {WorkspaceMode} from './workspace-mode';
import {VizId} from '../interfaces';
import {
  CLASS_ACTIVE_FILE,
  CLASS_CONNECTED_HOVER,
  CLASS_EXPANDED,
  CLASS_HOVER,
  CLASS_PINNED,
  CLASS_UNHOVER, CLASSES,
  LAYOUT_ANIMATION_TIME, VIEWPORT_ANIMATION_TIME,
} from '../constants';
import {LocalMode} from './local-mode';


export const AG_VIEW_TYPE = 'advanced_graph_view';
export const MD_VIEW_TYPE = 'markdown';

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


export class AdvancedGraphView extends ItemView {
    workspace: Workspace;
    settings: IAdvancedGraphSettings;
    initialNode: string;
    vault: Vault;
    plugin: AdvancedGraphPlugin;
    viz: Core;
    rebuildRelations = true;
    selectName: string = undefined;
    events: Events;
    datastores: IDataStore[];
    activeLayout: Layouts;
    hoverTimeout: Record<string, Timeout> = {};
    mode: IAGMode;

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
      this.mode = new LocalMode(this);
      this.addChild(this.mode);
      console.log('adding child');
    }

    async onOpen() {
      console.log('On open!');
      const viewContent = this.containerEl.children[1];
      viewContent.addClass('cy-content');
      // Ensure the canvas fits the whole container
      viewContent.setAttr('style', 'padding: 0');
      this.mode.createToolbar(viewContent);

      const div = document.createElement('div');
      div.id = 'cy' + VIEW_COUNTER;
      viewContent.appendChild(div);
      div.setAttr('style', 'height: 100%; width:100%');
      div.setAttr('tabindex', '0');


      const idInitial = new VizId(this.initialNode, 'core');

      const nodes = await this.neighbourhood([idInitial]);

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
      VIEW_COUNTER += 1;

      this.viz.$id(idInitial.toId()).addClass(CLASS_EXPANDED);

      const nodez = this.viz.nodes();
      const edges = await this.buildEdges(nodez);

      this.viz.add(edges);
      this.onGraphChanged(true);

      if (this.settings.debug) {
        console.log(nodes);
        console.log(edges);
      }

      const styleSheet = await this.createStylesheet();
      this.viz.style(styleSheet);

      this.activeLayout = this.viz.layout(this.colaLayout()).start();

      console.log('Visualization ready');

      const view = this;

      this.viz.on('tap', 'node', async (e) => {
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
      this.viz.on('mouseover', 'node', async (e) => {
        e.target.unlock();
        const node = e.target as NodeSingular;
        e.cy.elements()
            .difference(node.closedNeighborhood())
            .addClass(CLASS_UNHOVER);
        node.addClass(CLASS_HOVER)
            .connectedEdges()
            .addClass(CLASS_CONNECTED_HOVER)
            .connectedNodes()
            .addClass(CLASS_CONNECTED_HOVER);

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
            .addClass(CLASS_UNHOVER);
        edge.addClass('hover')
            .connectedNodes()
            .addClass(CLASS_CONNECTED_HOVER);
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
        e.cy.elements().removeClass([CLASS_HOVER, CLASS_UNHOVER, CLASS_CONNECTED_HOVER]);
        if (e.target.hasClass(CLASS_PINNED)) {
          e.target.lock();
        }
      });
      this.viz.on('grab', (e) => {
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
        node.lock();
        this.activeLayout.one('layoutstop', (e)=> {
          if (!node.hasClass(CLASS_PINNED)) {
            node.unlock();
          }
        });
      });
      this.viz.on('cxttap', (e) =>{
        // Thanks Liam for sharing how to do context menus
        const fileMenu = new Menu(); // Creates empty file menu
        if (!(e.target === this.viz) && e.target.group() === 'nodes') {
          const id = VizId.fromNode(e.target);
          e.target.select();
          const file = this.app.metadataCache.getFirstLinkpathDest(id.id, '');
          if (!(file === undefined)) {
            // hook for plugins to populate menu with "file-aware" menu items
            this.app.workspace.trigger('file-menu', fileMenu, file, 'my-context-menu', null);
          }
        }
        this.mode.fillMenu(fileMenu);
        fileMenu.showAtPosition({x: e.originalEvent.x, y: e.originalEvent.y});
      });
      this.viz.on('layoutstop', (e: EventObject) => {
        const activeFile = this.viz.nodes(`.${CLASS_ACTIVE_FILE}`);
        if (activeFile.length > 0) {
          const delayedAnimation = setTimeout(() => e.cy.animate({
            fit: {
              eles: activeFile.closedNeighborhood(),
              padding: 0,
            },
            duration: VIEWPORT_ANIMATION_TIME,
            queue: false,
          }), 100);
          this.viz.one('layoutstart', (e) => {
            // This prevents janky animations happening because of many consecutive restartLayout()
            clearTimeout(delayedAnimation);
          });
        }
      });

      this.trigger('vizReady', this.viz);
    }

    async popover(mdContent: string, sourcePath: string, target: Singular, styleClass: string) {
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
        edges.push(...await store.connectNodes(this.viz.nodes(), newNodes));
      }
      return edges;
    }

    async expand(toExpand: NodeCollection, batch=true): Promise<Collection> {
      // Currently returns the edges merged into the graph, not the full neighborhood
      const expandedIds = toExpand.map((n) => VizId.fromNode(n));
      const neighbourhood = await this.neighbourhood(expandedIds);
      this.mergeToGraph(neighbourhood, batch);
      const nodes = this.viz.collection();
      neighbourhood.forEach((n) => {
        nodes.merge(this.viz.$id(n.data.id) as NodeSingular);
      });
      const edges = await this.buildEdges(nodes);
      const edgesInGraph = this.mergeToGraph(edges);
      this.restartLayout();
      toExpand.addClass(CLASS_EXPANDED);
      this.trigger('expand', toExpand);
      return edgesInGraph;
    }

    async createStylesheet(): Promise<string> {
      const sheet = new GraphStyleSheet(this.plugin);
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


    removeNodes(nodes: NodeCollection): NodeCollection {
      // Only call this method if the node is forcefully removed from the graph, not when the node no longer exists
      // on the back-end. This is because of how it handles expanded.
      // Remove as expanded if a neighbour is removed from the graph.
      this.getExpanded()
          .intersection(nodes.neighborhood())
          .removeClass('expanded');
      const removed = nodes.remove();
      this.restartLayout();
      return removed;
    }


    fitView() {
      this.viz.fit();
    }

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
        refresh: 2, // number of ticks per frame; higher is faster but more jerky
        maxSimulationTime: LAYOUT_ANIMATION_TIME, // max length in ms to run the layout
        ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
        fit: false, // on every layout reposition of nodes, fit the viewport
        padding: 30, // padding around the simulation
        nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node
        // layout event callbacks
        ready: function() {
        }, // on layoutready
        stop: function() {
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
      this.activeLayout = this.viz.layout(this.colaLayout()).start();
    }

    mergeToGraph(elements: ElementDefinition[], batch=true): Collection {
      if (batch) {
        this.viz.startBatch();
      }
      const addElements: ElementDefinition[] = [];
      const mergedCollection = this.viz.collection();
      elements.forEach((n) => {
        if (this.viz.$id(n.data.id).length === 0) {
          addElements.push(n);
        } else {
          const gElement = this.viz.$id(n.data.id);
          const extraClasses = CLASSES.filter((clazz) => gElement.hasClass(clazz));
          // TODO: Maybe make an event here
          gElement.classes(n.classes);
          for (const clazz of extraClasses) {
            gElement.addClass(clazz);
          }
          gElement.data(n.data);
          mergedCollection.merge(gElement);
        }
      });
      mergedCollection.merge(this.viz.add(addElements));
      this.onGraphChanged(false);
      if (batch) {
        this.viz.endBatch();
      }
      return mergedCollection;
    }

    onGraphChanged(batch:boolean=true) {
      if (batch) {
        this.viz.startBatch();
      }
      this.viz.nodes().forEach((node) => {
        node.data('degree', node.degree(false));
        node.data('nameLength', node.data('name').length);
        console.log(node.data());
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


    public getPinned() {
      return this.viz.nodes(`.${CLASS_PINNED}`);
    }

    public getExpanded() {
      return this.viz.nodes(`.${CLASS_EXPANDED}`);
    }

    on(name:'stylesheet', callback: (sheet: GraphStyleSheet) => any): EventRef;
    on(name: 'expand', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'hide', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'pin', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'unpin', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'selectChange', callback: () => any): EventRef;
    on(name: 'vizReady', callback: (viz: Core) => any): EventRef;
    on(name: string, callback: (...data: any) => any, ctx?: any): EventRef {
      return this.events.on(name, callback, ctx);
    }
    off(name: string, callback: (...data: any) => any): void {
      this.events.off(name, callback);
    }
    offref(ref: EventRef): void {
      this.events.offref(ref);
    }
    trigger(name: 'stylesheet', sheet: GraphStyleSheet): void;
    trigger(name: 'expand', elements: NodeCollection): void;
    trigger(name: 'hide', elements: NodeCollection): void;
    trigger(name: 'pin', elements: NodeCollection): void;
    trigger(name: 'unpin', elements: NodeCollection): void;
    trigger(name: 'selectChange'): void;
    trigger(name: 'vizReady', viz: Core): void;
    trigger(name: string, ...data: any[]): void {
      this.events.trigger(name, ...data);
    }
    tryTrigger(evt: EventRef, args: any[]): void {
      this.events.tryTrigger(evt, args);
    }
}
