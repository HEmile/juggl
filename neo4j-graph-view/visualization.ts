import {IAdvancedGraphSettings} from './settings';
import {EventRef, Events, ItemView, Menu, TFile, Vault, Workspace, WorkspaceLeaf} from 'obsidian';
import AdvancedGraphPlugin from './main';
import cytoscape, {
  Core,
  EdgeDefinition,
  EdgeSingular,
  ElementDefinition, Layouts,
  NodeCollection,
  NodeDefinition,
  NodeSingular,
} from 'cytoscape';
import {IDataStore} from './interfaces';
import {GraphStyleSheet} from './stylesheet';

export const AG_VIEW_TYPE = 'advanced_graph_view';
export const MD_VIEW_TYPE = 'markdown';

export const PROP_VAULT = 'SMD_vault';
export const PROP_PATH = 'SMD_path';

export const DEF_LAYOUT = {
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

    constructor(leaf: WorkspaceLeaf, plugin: AdvancedGraphPlugin, initialNode: string, dataStores: IDataStore[]) {
      super(leaf);
      this.settings = plugin.settings;
      this.workspace = this.app.workspace;
      this.initialNode = initialNode;
      this.vault = this.app.vault;
      this.plugin = plugin;
      this.datastores = dataStores;
      this.events = new Events();
    }

    async onOpen() {
      console.log('stuff before the crash');
      const div = document.createElement('div');
      div.id = 'cy' + VIEW_COUNTER;
      VIEW_COUNTER += 1;
      this.containerEl.children[1].appendChild(div);
      div.setAttr('style', 'height: 100%; width:100%');

      const nodes: NodeDefinition[] = [];
      for (const store of this.datastores) {
        nodes.push(...await store.getNeighbourhood(new VizId(this.initialNode, 'core')));
      }


      this.viz = cytoscape({
        container: div,
        elements: nodes,
      });

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

      this.viz.layout(DEF_LAYOUT).run();

      console.log('Visualization ready');

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
      this.viz.on('mouseover', 'node', (e) => {
        console.log('mouseover');
        const node = e.target as NodeSingular;
        e.cy.nodes().addClass('unhover');
        e.cy.edges().addClass('unhover');
        node.addClass('hover');
        node.connectedEdges()
            .addClass('connected-hover')
            .removeClass('unhover')
            .connectedNodes()
            .addClass('connected-hover')
            .removeClass('unhover');
      });
      this.viz.on('mouseover', 'edge', (e) => {
        const edge = e.target as EdgeSingular;
        e.cy.nodes().addClass('unhover');
        e.cy.edges().addClass('unhover');
        edge.addClass('hover')
            .removeClass('unhover');
        edge.connectedNodes()
            .addClass('connected-hover')
            .removeClass('unhover');
      });
      this.viz.on('mouseout', (e) => {
        if (e.target === e.cy) {
          return;
        }
        e.cy.nodes().removeClass(['hover', 'unhover', 'connected-hover']);
        e.cy.edges().removeClass(['hover', 'unhover', 'connected-hover']);
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
        fileMenu.addItem((item) =>{
          item.setTitle('Expand selection (E)').setIcon('dot-network')
              .onClick((evt) => {
                // this.expandSelection();
              });
        });
        fileMenu.addItem((item) =>{
          item.setTitle('Hide selection (H)').setIcon('dot-network')
              .onClick((evt) => {
                // this.hideSelection();
              });
        });
        fileMenu.addItem((item) =>{
          item.setTitle('Invert selection (I)').setIcon('dot-network')
              .onClick((evt) => {
                // this.invertSelection();
              });
        });
        fileMenu.addItem((item) =>{
          item.setTitle('Select all (A)').setIcon('dot-network')
              .onClick((evt) => {
                // this.hideSelection();
              });
        });
        fileMenu.showAtPosition({x: e.originalEvent.x, y: e.originalEvent.y});
      });

      // Register on file open event
      this.registerEvent(this.workspace.on('file-open', async (file) => {
        console.log('file-open', file);
        if (file && this.settings.autoAddNodes) {
          const name = file.basename;
          const id = new VizId(name, 'core');
          console.log(this.viz.$id(id.toId()));
          console.log(this.viz.$id(id.toId()).length === 0);
          let node;
          if (this.viz.$id(id.toId()).length === 0) {
            for (const dataStore of this.datastores) {
              if (dataStore.storeId() === 'core') {
                node = await dataStore.get(id);
                this.viz.startBatch();
                console.log(node);
                this.viz.add(node);
                const edges = await this.buildEdges(this.viz.$id(id.toId()));
                console.log(edges);
                this.viz.add(edges);
                this.onGraphChanged(false);
                this.viz.endBatch();
                break;
              }
            }
          }
          node = this.viz.$id(id.toId()) as NodeSingular;
          this.viz.nodes().addClass('inactive-file');
          this.viz.edges().addClass('inactive-file');
          node.addClass('active-file')
              .removeClass('inactive-file');
          node.connectedEdges()
              .addClass('connected-active-file')
              .removeClass('inactive-file')
              .connectedNodes()
              .addClass('connected-active-file')
              .removeClass('inactive-file');

          this.viz.one('tap', (e) => {
            e.cy.nodes().removeClass(['connected-active-file', 'active-file', 'inactive-file']);
            e.cy.edges().removeClass(['connected-active-file', 'inactive-file']);
          });
        }
      }));

      //     this.network.on('doubleClick', (event) => {
      //       if (event.nodes.length > 0) {
      //         this.onDoubleClickNode(this.findNodeRaw(event.nodes[0]));
      //       }
      //     });
      //   if (this.rebuildRelations) {
      //     const inQuery = this.getInQuery(this.viz.nodes.getIds());
      //     const query = 'MATCH (n)-[r]-(m) WHERE n.' + PROP_VAULT + '= "' + this.vault.getName() + '" AND n.name ' + inQuery +
      //               ' AND  m.' + PROP_VAULT + '= "' + this.vault.getName() + '" AND m.name ' + inQuery +
      //               ' RETURN r';
      //     this.viz.updateWithCypher(query);
      //     this.rebuildRelations = false;
      //   }
      //   this.updateStyle();
      //   if (!(this.selectName=== undefined)) {
      //     this.viz.nodes.forEach((node) => {
      //       if (node.label === this.selectName) {
      //         this.network.setSelection({nodes: [node.id], edges: []});
      //         this.selectName = undefined;
      //       }
      //     });
      //   }

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
      // // Register keypress event
      // this.containerEl.addEventListener('keydown', (evt) => {
      //   if (evt.key === 'e') {
      //     this.expandSelection();
      //   } else if (evt.key === 'h' || evt.key === 'Backspace') {
      //     this.hideSelection();
      //   } else if (evt.key === 'i') {
      //     this.invertSelection();
      //   } else if (evt.key === 'a') {
      //     this.selectAll();
      //   }
      // });
    }

    async buildEdges(newNodes: NodeCollection) {
      const edges = [];
      for (const store of this.datastores) {
        edges.push(...await store.connectNodes(this.viz.nodes(), VizId.fromNodes(newNodes)));
      }
      return edges;
    }

    async createStylesheet(): Promise<string> {
      const sheet = new GraphStyleSheet(this);
      this.trigger('stylesheet', sheet);
      return await sheet.getStylesheet();
    }

    protected async onClose(): Promise<void> {
    }

    updateWithCypher(cypher: string) {
      if (this.settings.debug) {
        console.log(cypher);
      }
      // this.viz.updateWithCypher(cypher);
      this.rebuildRelations = true;
    }


    updateStyle() {
      const nodeOptions = JSON.parse(this.settings.nodeSettings);
      // this.viz.nodes.forEach((node) => {
      //   const nodeId = this.network.findNode(node.id);
      //
      //   const specificOptions: NodeOptions[] = [];
      //   const file = this.getFileFromNode(node);
      //   if (this.settings.community === 'tags') {
      //     node.raw.labels.forEach((label) => {
      //       if (label in nodeOptions) {
      //         specificOptions.push(nodeOptions[label]);
      //       }
      //     });
      //   } else if (this.settings.community === 'folders' && !(file === undefined)) {
      //     // @ts-ignore
      //     const path = file.parent.path;
      //     if (path in nodeOptions) {
      //       specificOptions.push(nodeOptions[path]);
      //     }
      //   }
      //   // Style images
      //   if (/(\.png|\.jpg|\.jpeg|\.gif|\.svg)$/.test(node.label) && !(file === undefined)) {
      //     specificOptions.push({shape: 'image', image: 'http://localhost:' +
      //                   this.settings.imgServerPort + '/' +
      //                   encodeURI(file.path)});
      //     if ('image' in nodeOptions) {
      //       specificOptions.push(nodeOptions['image']);
      //     }
      //   }
      //   // @ts-ignore
      //   const nodeSth = this.network.body.nodes[nodeId];
      //   if (!(nodeSth === undefined)) {
      //     nodeSth.setOptions(Object.assign({}, nodeOptions['defaultStyle'], ...specificOptions));
      //   } else if (this.settings.debug) {
      //     console.log(node);
      //   }
      // });
    //   this.viz.edges.forEach((edge) => {
    //     // @ts-ignore
    //     const edgeSth = this.network.body.edges[edge.id];
    //     const type = edge.raw.type;
    //     const specificOptions = type in edgeOptions ? [edgeOptions[type]] : [];
    //     if (!(edgeSth === undefined)) {
    //       edgeSth.setOptions(Object.assign({}, edgeOptions['defaultStyle'], ...specificOptions));
    //     } else if (this.settings.debug) {
    //       console.log(edge);
    //     }
    //   });
    }

    // async onClickNode(node: INode) {
    //   const file = this.getFileFromNode(node);
    //   // @ts-ignore
    //   const label = node.raw.properties['name'];
    //   if (file) {
    //     await this.plugin.openFile(file);
    //   } else {
    //     // Create dangling file
    //     // TODO: Add default folder
    //     // @ts-ignore
    //     const filename = label + '.md';
    //     const createdFile = await this.vault.create(filename, '');
    //     await this.plugin.openFile(createdFile);
    //   }
    //   if (this.settings.autoExpand) {
    //     await this.updateWithCypher(this.plugin.localNeighborhoodCypher(label));
    //   }
    // }

    // async onDoubleClickNode(node: Node) {
    //   // @ts-ignore
    //   const label = node.properties['name'];
    //   this.expandedNodes.push(label);
    //   await this.updateWithCypher(this.plugin.localNeighborhoodCypher(label));
    // }

    async onClickEdge(edge: Object) {
      // @ts-ignore
      // if (!edge.raw) {
      //     return;
      // }
      // // @ts-ignore
      // const rel = edge.raw as Relationship;
      // console.log(edge);
      // // @ts-ignore
      // const file = rel.properties["context"];
      // const node = this.viz.nodes.get(rel.start.high);
      // const label = node.label;

      // TODO: Figure out how to open a node at the context point
      // this.workspace.openLinkText()

    }


    public async onNodeModify(name: string) {
      if (this.expandedNodes.includes(name)) {
        this.updateWithCypher(this.plugin.localNeighborhoodCypher(name));
      } else {
        this.updateWithCypher(this.plugin.nodeCypher(name));
      }
    }

    public async onNodeRenamed(oldName: string, newName: string) {
      if (this.expandedNodes.includes(oldName)) {
        this.updateWithCypher(this.plugin.localNeighborhoodCypher(newName));
        this.expandedNodes.remove(oldName);
        this.expandedNodes.push(newName);
      } else {
        this.updateWithCypher(this.plugin.nodeCypher(newName));
      }
    }

    public async onNodeDeleted(name: string) {
    // TODO: Maybe automatically update to dangling link by running an update query.
    //   this.deleteNode(name);
    // view.updateStyle();
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

    // async expandSelection() {
    //   const selected_nodes = this.network.getSelectedNodes();
    //   if (selected_nodes.length === 0) {
    //     return;
    //   }
    //   let query = 'MATCH (n)-[r]-(m) WHERE n.' + PROP_VAULT + '= "' + this.vault.getName() + '" AND n.name ';
    //   query += this.getInQuery(selected_nodes);
    //   query += ' RETURN r,m';
    //   const expandedNodes = this.expandedNodes;
    //   selected_nodes.forEach((id) => {
    //     // @ts-ignore
    //     const title = this.findNodeRaw(id).properties['name'] as string;
    //     if (!expandedNodes.includes(title)) {
    //       expandedNodes.push(title);
    //     }
    //   });
    //   this.updateWithCypher(query);
    // }

    // deleteNode(id: IdType) {
    //   // console.log(this.viz.nodes);
    //   // @ts-ignore
    //
    //   const node = this.findNode(id) || this.nodes[id];
    //   if (node === undefined) {
    //     return;
    //   }
    //   // @ts-ignore
    //   const title = node.raw.properties['name'] as string;
    //   if (this.expandedNodes.includes(title)) {
    //     this.expandedNodes.remove(title);
    //   }
    //   const expandedNodes = this.expandedNodes;
    //   this.network.getConnectedNodes(id).forEach((value: any) => {
    //     this.findNodeRaw(value);
    //     // @ts-ignore
    //     const n_title = this.findNodeRaw(value).properties['name'] as string;
    //     if (expandedNodes.includes(n_title)) {
    //       expandedNodes.remove(n_title);
    //     }
    //   });
    //
    //   const edges_to_remove: IEdge[] = [];
    //   this.viz.edges.forEach((edge) => {
    //     if (edge.from === id || edge.to === id) {
    //       edges_to_remove.push(edge);
    //     }
    //   });
    //   edges_to_remove.forEach((edge) => {
    //     this.viz.edges.remove(edge);
    //   });
    //
    //   this.viz.nodes.remove(id);
    //
    //   const keys_to_remove = [];
    //   for (const key in this.edges) {
    //     const edge = this.edges[key];
    //     if (edge.to === id || edge.from === id) {
    //       keys_to_remove.push(key);
    //     }
    //   }
    //   keys_to_remove.forEach((key) => {
    //     // @ts-ignore
    //     delete this.edges[key];
    //   });
    //
    //   delete this.nodes[id as number];
    // }
    //
    // deleteEdge(id: IdType) {
    //   const edge = this.edges[id];
    //   if (edge === undefined) {
    //     return;
    //   }
    //
    //   const nodes = [edge.from, edge.to];
    //
    //   this.viz.edges.remove(edge);
    //
    //   delete this.edges[id];
    //
    //   // TODO: Check if the node deletion is using the right rule
    //   // Current rule: The connected nodes are not expanded, and also have no other edges.
    //   nodes.forEach((node_id) => {
    //     const node = this.findNodeRaw(node_id);
    //     // @ts-ignore
    //     if (!this.expandedNodes.contains(node.properties['name']) &&
    //             this.network.getConnectedEdges(node_id).length === 0) {
    //       this.deleteNode(node_id);
    //     }
    //   });
    // }
    //
    // async hideSelection() {
    //   if (this.network.getSelectedNodes().length === 0) {
    //     return;
    //   }
    //   // Update expanded nodes. Make sure to not automatically expand nodes of which a neighbor was hidden.
    //   // Otherwise, one would have to keep hiding nodes.
    //   this.network.getSelectedNodes().forEach((id) => {
    //     this.deleteNode(id);
    //   });
    //   // this.network.deleteSelected();
    //
    //   // This super hacky code is used because neovis.js doesn't like me removing nodes from the graph.
    //   // Essentially, whenever it'd execute a new query, it'd re-add all hidden nodes!
    //   // This resets the state of NeoVis so that it only acts as an interface with neo4j instead of also keeping
    //   // track of the data.
    //   // @ts-ignore
    //   // let data = {nodes: this.viz.nodes, edges: this.viz.edges} as Data;
    //   // this.viz.clearNetwork();
    //   // this.network.setData(data);
    //   this.updateStyle();
    // }

    // invertSelection() {
    //   const selectedNodes = this.network.getSelectedNodes();
    //   const network = this.network;
    //   const inversion = this.viz.nodes.get({filter: function(item) {
    //     return !selectedNodes.contains(item.id) && network.findNode(item.id).length > 0;
    //   }}).map((item) => item.id);
    //   this.network.setSelection({nodes: inversion, edges: []});
    // }

    mergeToGraph(elements: ElementDefinition[]) {
      this.viz.startBatch();
      const addElements: ElementDefinition[] = [];
      elements.forEach((n) => {
        if (this.viz.$id(n.data.id).length === 0) {
          const gElement = this.viz.$id(n.data.id);
          gElement.classes(n.classes);
          gElement.data(n.data);
        } else {
          addElements.push(n);
        }
      });
      this.viz.add(addElements);
      this.onGraphChanged(false);
      this.viz.endBatch();
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
      this.viz.layout(DEF_LAYOUT).run();
    }


    selectAll() {
      // this.network.unselectAll();
      // this.invertSelection();
    }

    // async checkAndUpdate() {
    //   try {
    //     if (await this.checkActiveLeaf()) {
    //       await this.update();
    //     }
    //   } catch (error) {
    //     console.error(error);
    //   }
    // }

    async update() {
      this.load();
    }
    //
    // async checkActiveLeaf() {
    //   return false;
    // }

    getDisplayText(): string {
      return 'Advanced Graph';
    }

    getViewType(): string {
      return AG_VIEW_TYPE;
    }

    on(name:'stylesheet', callback: (sheet: GraphStyleSheet) => any): EventRef;
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
    trigger(name: string, ...data: any[]): void {
      this.events.trigger(name, ...data);
    }
    tryTrigger(evt: EventRef, args: any[]): void {
      this.events.tryTrigger(evt, args);
    }
}
