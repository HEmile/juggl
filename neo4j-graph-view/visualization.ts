import {IAdvancedGraphSettings} from './settings';
import {EventRef, Events, ItemView, MarkdownRenderer, Menu, TFile, Vault, Workspace, WorkspaceLeaf} from 'obsidian';
import AdvancedGraphPlugin from './main';
import cytoscape, {
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
      console.log('stuff before the crash');
      const div = document.createElement('div');
      div.id = 'cy' + VIEW_COUNTER;
      VIEW_COUNTER += 1;
      this.containerEl.children[1].appendChild(div);
      div.setAttr('style', 'height: 100%; width:100%');
      div.setAttr('tabindex', '0');

      const nodes: NodeDefinition[] = [];
      for (const store of this.datastores) {
        nodes.push(...await store.getNeighbourhood(new VizId(this.initialNode, 'core')));
      }


      this.viz = cytoscape({
        container: div,
        elements: nodes,
        minZoom: 8e-1,
        maxZoom: 1.3e1,
      });

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
            await this.popover(content, file.path, e.target, 'advanced-graph-preview-node');
          }
        }
      });
      this.viz.on('drag', (e) => {
        if (this.activeLayout) {
          this.activeLayout.stop();
        }
      });
      this.viz.on('add remove', (e) => {
        if (this.activeLayout) {
          this.activeLayout.stop();
        }
        console.log('starting layout');
        this.activeLayout = this.viz.layout(this.colaLayout()).start();
      });
      this.viz.on('dragfree', (e) => {
        if (this.activeLayout) {
          this.activeLayout.stop();
        }
        // this.activeLayout = this.viz.layout(this.colaLayout()).start();
        this.activeLayout.start();
        const node = e.target;
        this.activeLayout.one('layoutstop', (e)=> {
          console.log('here');
          node.unlock();
        });
        node.lock();
      });

      this.viz.on('mouseover', 'edge', async (e) => {
        const edge = e.target as EdgeSingular;
        e.cy.elements()
            .difference(edge.connectedNodes().union(edge))
            .addClass('unhover');
        edge.addClass('hover')
            .connectedNodes()
            .addClass('connected-hover');
        if ('context' in edge.data() && e.originalEvent.metaKey) {
          // TODO resolve SourcePath, can be done using the source file.
          // @ts-ignore
          await this.popover(edge.data()['context'], '', edge, 'advanced-graph-preview-edge');
        }
      });
      this.viz.on('mouseout', (e) => {
        if (e.target === e.cy) {
          return;
        }
        e.cy.elements().removeClass(['hover', 'unhover', 'connected-hover']);
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
                this.viz.fit(this.viz.elements());
                // const animation = this.viz.animate({
                //   fit: {
                //     eles: vizNode.closedNeighborhood(),
                //     padding: 0,
                //   },
                //   duration: 5000,
                //   queue: false,
                // });
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
        console.log(evt);
        if (evt.key === 'e') {
          // this.expandSelection();
        } else if (evt.key === 'h' || evt.key === 'Backspace') {
          // this.hideSelection();
        } else if (evt.key === 'i') {
          this.viz.$(':selected')
              .unselect()
              .absoluteComplement()
              .select();
        } else if (evt.key === 'a') {
          this.viz.elements().select();
        }
      }, true);

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
          console.log('h1');
          if (!newDiv.hasClass('popover-hovered')) {
            popper.destroy();
            newDiv.remove();
          }
          console.log('h2');
        }, 300);
      });
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

    colaLayout(): LayoutOptions {
      const viz = this;
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
        // flow: undefined, // use DAG/tree flow layout if specified, e.g. { axis: 'y', minSeparation: 30 }
        // alignment: undefined, // relative alignment constraints on nodes, e.g. {vertical: [[{node: node1, offset: 0}, {node: node2, offset: 5}]], horizontal: [[{node: node3}, {node: node4}], [{node: node5}, {node: node6}]]}
        // gapInequalities: undefined, // list of inequality constraints for the gap between the nodes, e.g. [{"axis":"y", "left":node1, "right":node2, "gap":25}]
        //
        // // different methods of specifying edge length
        // // each can be a constant numerical value or a function like `function( edge ){ return 2; }`
        // edgeLength: undefined, // sets edge length directly in simulation
        // edgeSymDiffLength: undefined, // symmetric diff edge length in simulation
        // edgeJaccardLength: undefined, // jaccard edge length in simulation
        //
        // // iterations of cola algorithm; uses default values on undefined
        // unconstrIter: undefined, // unconstrained initial layout iterations
        // userConstIter: undefined, // initial layout iterations with user-specified constraints
        // allConstIter: undefined, // initial layout iterations with all constraints including non-overlap
      };
    }

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
