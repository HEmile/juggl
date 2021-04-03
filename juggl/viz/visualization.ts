import type {IJugglSettings} from '../settings';
import {
  Component, debounce,
  EventRef,
  Events,
  MarkdownRenderer,
  Menu,
  Vault,
  Workspace,
} from 'obsidian';
import type JugglPlugin from '../main';
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
import type {IAGMode, IDataStore, IJugglStores, IMergedToGraph} from '../interfaces';
import {GraphStyleSheet, StyleGroup} from './stylesheet';
import Timeout = NodeJS.Timeout;

import {WorkspaceMode} from './workspaces/workspace-mode';
import {VizId} from '../interfaces';
import {
  CLASS_ACTIVE_NODE,
  CLASS_CONNECTED_HOVER,
  CLASS_EXPANDED, CLASS_FILTERED,
  CLASS_HOVER,
  CLASS_PINNED, CLASS_PROTECTED,
  CLASS_UNHOVER, CLASSES, DEBOUNCE_FOLLOW, DEBOUNCE_LAYOUT,
  VIEWPORT_ANIMATION_TIME,
} from '../constants';
import {LocalMode} from './local-mode';
import type {LayoutSettings} from './layout-settings';
import {parseLayoutSettings} from './layout-settings';
import {filter} from './query-builder';

export const MD_VIEW_TYPE = 'markdown';

let VIEW_COUNTER = 0;

export class Juggl extends Component {
    element: Element;
    workspace: Workspace;
    settings: IJugglSettings;
    initialNodes: string[];
    vault: Vault;
    plugin: JugglPlugin;
    viz: Core;
    rebuildRelations = true;
    selectName: string = undefined;
    events: Events;
    datastores: IJugglStores;
    activeLayout: Layouts;
    hoverTimeout: Record<string, Timeout> = {};
    mode: IAGMode;
    vizReady = false;
    destroyHover: () => void = null;
    debouncedRestartLayout: () => void;

    constructor(element: Element, plugin: JugglPlugin, dataStores: IJugglStores, settings: IJugglSettings, initialNodes?: string[]) {
      super();
      this.element = element;
      this.settings = settings;
      this.workspace = plugin.app.workspace;
      this.initialNodes = initialNodes;
      this.vault = plugin.app.vault;
      this.plugin = plugin;
      this.datastores = dataStores;
      this.events = new Events();
      if (this.settings.mode === 'local') {
        this.mode = new LocalMode(this);
      } else if (this.settings.mode === 'workspace') {
        this.mode = new WorkspaceMode(this);
      }
      this.addChild(this.mode);
      this.debouncedRestartLayout = debounce(this.restartLayout, DEBOUNCE_LAYOUT, true);
    }

    async onload() {
      this.element.addClass('cy-content');
      // Ensure the canvas fits the whole container
      this.element.setAttr('style', 'padding: 0');
      this.element.setAttr('tabindex', 0);

      if (this.settings.toolbar) {
        const toolbarDiv = document.createElement('div');
        toolbarDiv.addClass('cy-toolbar');
        this.element.appendChild(toolbarDiv);
        this.mode.createToolbar(toolbarDiv);
      }

      const div = document.createElement('div');
      div.id = 'cy' + VIEW_COUNTER;
      this.element.appendChild(div);
      div.setAttr('style', `height: ${this.settings.height}; width:${this.settings.width}`);
      div.setAttr('tabindex', '0');

      let nodes: NodeDefinition[];
      let idsInitial: VizId[] = null;
      if (this.initialNodes) {
        idsInitial = this.initialNodes.map((s) => new VizId(s, 'core'));
        if (this.settings.expandInitial) {
          nodes = await this.neighbourhood(idsInitial);
        } else {
          nodes = await Promise.all(idsInitial.map( (id) => this.datastores.coreStore.get(id)));
        }
        this.viz = cytoscape({
          container: div,
          elements: nodes,
          minZoom: 0.3,
          maxZoom: 10,
          wheelSensitivity: this.settings.zoomSpeed,
        });
      } else {
        this.viz = cytoscape({
          container: div,
          elements: [{data: {id: 'a'}}, {data: {id: 'b'}}],
          minZoom: 0.3,
          maxZoom: 10,
          wheelSensitivity: this.settings.zoomSpeed,
        });
      }

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

      if (idsInitial ) {
        for (const id of idsInitial) {
          const initialNode = this.viz.$id(id.toId());
          if (this.settings.expandInitial) {
            initialNode.addClass(CLASS_EXPANDED);
          }
          initialNode.addClass(CLASS_PROTECTED);
        }
        const nodez = this.viz.nodes();
        const edges = await this.buildEdges(nodez);
        this.viz.add(edges);
        this.onGraphChanged(true);
      }
      await this.updateStylesheet();

      // Shouldn'' this just call restartLayout?

      if (idsInitial) {
        this.restartLayout();
      }

      console.log('Visualization ready');

      const view = this;
      this.viz.on('tap boxselect', async (e) => {
        // @ts-ignore
        this.element.focus();
      });

      this.viz.on('tap', 'node', async (e) => {
        const id = VizId.fromNode(e.target);
        if (!(id.storeId === 'core')) {
          return;
        }
        // TODO THIS SHOULD BE MOVED TO LOCAL MODE!
      });
      this.viz.on('tap', 'edge', async (e) => {
        // todo: move to correct spot in the file.
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
            400);
          }
        }
      });
      this.viz.on('mouseover', 'edge', async (e) => {
        const edge = e.target as EdgeSingular;
        if (this.settings.hoverEdges) {
          e.cy.elements()
              .difference(edge.connectedNodes().union(edge))
              .addClass(CLASS_UNHOVER);
          edge.addClass('hover')
              .connectedNodes()
              .addClass(CLASS_CONNECTED_HOVER);
        }
        if ('context' in edge.data()) {// && e.originalEvent.metaKey) {
          // TODO resolve SourcePath, can be done using the source file.
          this.hoverTimeout[e.target.id()] = setTimeout(async () =>
          // @ts-ignore
            await this.popover(edge.data()['context'], '', edge, 'juggl-preview-edge'),
          800);
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
          if (id.storeId === 'core') {
            const file = this.plugin.app.metadataCache.getFirstLinkpathDest(id.id, '');
            if (!(file === undefined)) {
            // hook for plugins to populate menu with "file-aware" menu items
              this.plugin.app.workspace.trigger('file-menu', fileMenu, file, 'my-context-menu', null);
            }
          }
        }
        this.mode.fillMenu(fileMenu, this.viz.nodes(':selected'));
        fileMenu.showAtPosition({x: e.originalEvent.x, y: e.originalEvent.y});
      });
      this.viz.on('layoutstop', debounce((e: EventObject) => {
        if (!this.settings.autoZoom) {
          return;
        }
        let fitNodes: NodeCollection;
        const activeFile = this.viz.nodes(`.${CLASS_ACTIVE_NODE}`);
        if (activeFile.length > 0) {
          fitNodes = activeFile.closedNeighborhood();
        } else {
          fitNodes = this.viz.nodes();
        }
        e.cy.animate({
          fit: {
            eles: fitNodes,
            padding: 0,
          },
          duration: VIEWPORT_ANIMATION_TIME,
          queue: false,
        });
      }, DEBOUNCE_FOLLOW, true));
      this.vizReady = true;
      this.trigger('vizReady', this.viz);
    }

    async popover(mdContent: string, sourcePath: string, target: Singular, styleClass: string) {
      const newDiv = document.createElement('div');
      newDiv.addClasses(['popover', 'hover-popover', 'is-loaded', 'juggl-hover']);
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
      this.destroyHover = () => {
        popper.destroy();
        newDiv.remove();
        this.destroyHover = null;
      };
      newDiv.addEventListener('mouseleave', this.destroyHover);
      const destroyHover = this.destroyHover;
      this.viz.one('mouseout', (e) => {
        setTimeout(function() {
          if (!newDiv.hasClass('popover-hovered')) {
            destroyHover();
          }
        }, 300);
      });
    }

    async neighbourhood(toExpand: VizId[]) : Promise<NodeDefinition[]> {
      const nodes: NodeDefinition[] = [];
      for (const store of this.datastores.dataStores) {
        nodes.push(...await store.getNeighbourhood(toExpand));
      }
      return nodes;
    }

    async buildEdges(newNodes: NodeCollection): Promise<EdgeDefinition[]> {
      const edges: EdgeDefinition[] = [];
      for (const store of this.datastores.dataStores) {
        edges.push(...await store.connectNodes(this.viz.nodes(), newNodes, this));
      }
      return edges;
    }

    async expand(toExpand: NodeCollection, batch=true, triggerGraphChanged=true): Promise<IMergedToGraph> {
      if (toExpand.length === 0) {
        return null;
      }
      if (batch) {
        this.viz.startBatch();
      }
      toExpand.addClass(CLASS_EXPANDED);
      toExpand.addClass(CLASS_PROTECTED);
      // Currently returns the edges merged into the graph, not the full neighborhood
      const expandedIds = toExpand.map((n) => VizId.fromNode(n));
      const neighbourhood = await this.neighbourhood(expandedIds);
      this.mergeToGraph(neighbourhood, false, false);
      const nodes = this.viz.collection();
      neighbourhood.forEach((n) => {
        nodes.merge(this.viz.$id(n.data.id) as NodeSingular);
      });

      const edges = await this.buildEdges(nodes);
      const edgesInGraph = this.mergeToGraph(edges, false, triggerGraphChanged);
      if (batch) {
        this.viz.endBatch();
      }
      this.trigger('expand', toExpand);
      return edgesInGraph;
    }

    async updateStylesheet(): Promise<void> {
      const sheet = new GraphStyleSheet(this.plugin);
      this.trigger('stylesheet', sheet);
      const sSheet = await sheet.getStylesheet(this);
      this.viz.style(sSheet);
    }

    onunload(): void {
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
      let removed = null;
      this.viz.batch(() => {
        this.getExpanded()
            .intersection(nodes.neighborhood())
            .removeClass('expanded');
        removed = nodes.remove();
        this.onGraphChanged(false, true);
      });
      return removed;
    }


    fitView(nodes?: NodeCollection) {
      if (nodes) {
        this.viz.fit(nodes);
      } else {
        this.viz.fit();
      }
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

    restartLayout() {
      if (this.activeLayout) {
        this.activeLayout.stop();
      }
      const layoutSettings = parseLayoutSettings(this.settings);
      this.activeLayout = layoutSettings.startLayout(this);
    }

    setLayout(settings: LayoutSettings) {
      this.settings.layout = settings.options;
      this.restartLayout();
    }


    mergeToGraph(elements: ElementDefinition[], batch=true, triggerGraphChanged=true): IMergedToGraph {
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

          // @ts-ignore
          extraClasses.push(...gElement.classes().filter((el: string) => el.startsWith('global-') || el.startsWith('local-')));

          // TODO: Maybe make an event here
          gElement.classes(n.classes);
          for (const clazz of extraClasses) {
            gElement.addClass(clazz);
          }
          gElement.data(n.data);
          mergedCollection.merge(gElement);
        }
      });
      const addCollection = this.viz.add(addElements);
      mergedCollection.merge(addCollection);
      if (triggerGraphChanged) {
        this.onGraphChanged(false);
      }
      if (batch) {
        this.viz.endBatch();
      }
      return {merged: mergedCollection, added: addCollection};
    }

    assignStyleGroups() {
      const viz = this.viz;
      const _assignGroups = function(groups: StyleGroup[], prefix: string) {
        for (const [index, group] of groups.entries()) {
          const clazz = `${prefix}-${index}`;
          viz.nodes().removeClass(clazz);
          const filteredNodes = filter(group.filter, viz.nodes());
          filteredNodes.addClass(clazz);
        }
      };
      _assignGroups(this.settings.styleGroups, 'local');
      _assignGroups(this.plugin.settings.globalStyleGroups, 'global');
    }

    onGraphChanged(batch:boolean=true, debounceLayout=false) {
      if (batch) {
        this.viz.startBatch();
      }
      this.viz.nodes().forEach((node) => {
        node.data('degree', node.degree(false));
        node.data('nameLength', node.data('name').length);
      });
      if (batch) {
        this.viz.endBatch();
      }

      this.trigger('elementsChange');
      this.searchFilter(this.settings.filter);
      if (debounceLayout) {
        this.debouncedRestartLayout();
      } else {
        this.restartLayout();
      }
      this.assignStyleGroups();
    }

    public getViz(): Core {
      return this.viz;
    }

    public setMode(modeName: string) {
      this.removeChild(this.mode);
      if (modeName === 'local') {
        this.mode = new LocalMode(this);
      } else if (modeName === 'workspace') {
        this.mode = new WorkspaceMode(this);
      }
      this.addChild(this.mode);
      if (this.settings.toolbar) {
        this.mode.createToolbar(this.element.children[0]);
      }
    }

    searchFilter(query: string) {
      // The query here is in approximately the format of Obsidian search queries
      // This is much less efficient than using selectors, so only use this if you need to parse user input.
      this.viz.nodes().removeClass(CLASS_FILTERED);
      const filteredNodes = filter(query, this.viz.nodes());
      this.viz.nodes().difference(filteredNodes).addClass(CLASS_FILTERED);
      this.settings.filter = query;
    }

    public getPinned() {
      return this.viz.nodes(`.${CLASS_PINNED}`);
    }

    public getExpanded() {
      return this.viz.nodes(`.${CLASS_EXPANDED}`);
    }

    public getProtected() {
      return this.viz.nodes(`.${CLASS_PROTECTED}`);
    }

    on(name:'stylesheet', callback: (sheet: GraphStyleSheet) => any): EventRef;
    on(name: 'expand', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'hide', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'pin', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'unpin', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'selectChange', callback: () => any): EventRef;
    on(name: 'elementsChange', callback: () => any): EventRef;
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
    trigger(name: 'elementsChange'): void;
    trigger(name: 'vizReady', viz: Core): void;
    trigger(name: string, ...data: any[]): void {
      this.events.trigger(name, ...data);
    }
    tryTrigger(evt: EventRef, args: any[]): void {
      this.events.tryTrigger(evt, args);
    }
}
