import {IEdge, INode, IRelationshipConfig, NEOVIS_DEFAULT_CONFIG} from "neovis.js";
import NeoVis from 'neovis.js';
import {INeo4jViewSettings} from "./settings";
import {EventRef, ItemView, MarkdownView, Menu, normalizePath, TFile, Vault, Workspace, WorkspaceLeaf} from "obsidian";
import Neo4jViewPlugin from "./main";
import {Relationship, Node} from "neo4j-driver";
import {Data, IdType, Network, NodeOptions} from "vis-network";

export const NV_VIEW_TYPE = "neovis";
export const MD_VIEW_TYPE = 'markdown';

export const PROP_VAULT = "SMD_vault"
export const PROP_PATH = "SMD_path"
export const PROP_COMMUNITY = "SMD_community"

let VIEW_COUNTER = 0;

export class NeoVisView extends ItemView{

    workspace: Workspace;
    listeners: EventRef[];
    settings: INeo4jViewSettings;
    initial_query: string;
    vault: Vault;
    plugin: Neo4jViewPlugin;
    viz: NeoVis;
    network: Network;
    hasClickListener = false;
    rebuildRelations = true;
    selectName: string = undefined;
    expandedNodes: string[] = [];
    nodes: Record<IdType, INode>;
    edges: Record<IdType, IEdge>;

    constructor(leaf: WorkspaceLeaf, initial_query: string, plugin: Neo4jViewPlugin) {
        super(leaf);
        this.settings = plugin.settings;
        this.workspace = this.app.workspace;
        this.initial_query = initial_query;
        this.vault = this.app.vault;
        this.plugin = plugin;
    }

    async onOpen() {
        const div = document.createElement("div");
        div.id = "neovis_id" + VIEW_COUNTER;
        VIEW_COUNTER += 1;
        this.containerEl.children[1].appendChild(div);
        div.setAttr("style", "height: 100%; width:100%");
        // console.log(this.containerEl);
        const config = {
            container_id: div.id,
            server_url: "bolt://localhost:7687",
            server_user: "neo4j",
            server_password: this.settings.password,
            arrows: this.settings.show_arrows,
            hierarchical: this.settings.hierarchical,
            labels: {
                [NEOVIS_DEFAULT_CONFIG]: {
                    "caption": "name",
                    //"size": this.settings.node_size,
                    "community": PROP_COMMUNITY,
                    "title_properties": [
                        "aliases",
                        "content"
                    ],
                }
            },
            relationships: {
                "inline": {
                    "thickness": "weight",
                    "caption": this.settings.inlineContext ? "context": false,
                    "title_properties": [
                        "parsedContext"
                    ]
                },
                [NEOVIS_DEFAULT_CONFIG]: {
                    "thickness": "defaultThicknessProperty",
                    "caption": true
                }
            },
            initial_cypher: this.initial_query
        };
        this.viz = new NeoVis(config);
        this.viz.registerOnEvent("completed", (e)=>{
            if (!this.hasClickListener) {
                // @ts-ignore
                this.network = this.viz["_network"] as Network;
                // @ts-ignore
                this.nodes = this.viz._nodes;
                // @ts-ignore
                this.edges = this.viz._edges;
                // Register on click event
                this.network.on("click", (event) => {
                    if (event.nodes.length > 0) {
                        this.onClickNode(this.findNode(event.nodes[0]));
                    }
                    else if (event.edges.length == 1) {
                        this.onClickEdge(this.findEdge(event.edges[0]));
                    }
                });
                this.network.on("doubleClick", (event) => {
                    if (event.nodes.length > 0) {
                        this.onDoubleClickNode(this.findNodeRaw(event.nodes[0]));
                    }
                });
                this.network.on("oncontext", (event) => {
                    // Thanks Liam for sharing how to do context menus
                    const fileMenu = new Menu(); // Creates empty file menu
                    let nodeId = this.network.getNodeAt(event.pointer.DOM);

                    if (!(nodeId === undefined)) {
                        let node = this.findNode(nodeId);
                        let file = this.getFileFromNode(node);
                        if (!(file === undefined)) {
                            // hook for plugins to populate menu with "file-aware" menu items
                            this.app.workspace.trigger("file-menu", fileMenu, file, "my-context-menu", null);
                        }
                    }
                    fileMenu.addItem((item) =>{
                        item.setTitle("Expand selection (E)").setIcon("dot-network")
                            .onClick(evt => {
                                this.expandSelection();
                            });
                    });
                    fileMenu.addItem((item) =>{
                        item.setTitle("Hide selection (H)").setIcon("dot-network")
                            .onClick(evt => {
                                this.hideSelection();
                            });
                    });
                    fileMenu.addItem((item) =>{
                        item.setTitle("Invert selection (I)").setIcon("dot-network")
                            .onClick(evt => {
                                this.invertSelection();
                            });
                    });
                    fileMenu.addItem((item) =>{
                        item.setTitle("Select all (A)").setIcon("dot-network")
                            .onClick(evt => {
                                this.hideSelection();
                            });
                    });
                    let domRect = this.containerEl.getBoundingClientRect();
                    // console.log("DOM", event.pointer.DOM);
                    // console.log("Canvas", event.pointer.canvas);
                    // console.log("offset", domRect.left, domRect.top)
                    // console.log("DOM offset", { x: event.pointer.DOM.x + domRect.left, y: event.pointer.DOM.y + domRect.top });
                    // console.log("Canvas offset", { x: event.pointer.canvas.x + domRect.left, y: event.pointer.canvas.y + domRect.top });
                    // Actually open the menu
                    fileMenu.showAtPosition({ x: event.pointer.DOM.x + domRect.left, y: event.pointer.DOM.y + domRect.top });
                })
                this.hasClickListener = true;
            }
            if (this.rebuildRelations) {
                let inQuery = this.getInQuery(this.viz.nodes.getIds());
                let query = "MATCH (n)-[r]-(m) WHERE n." + PROP_VAULT + "= \"" + this.vault.getName() + "\" AND n.name " + inQuery
                    + " AND  m." + PROP_VAULT + "= \"" + this.vault.getName() + "\" AND m.name " + inQuery +
                    " RETURN r";
                this.viz.updateWithCypher(query);
                this.rebuildRelations = false;
            }
            this.updateStyle();
            if (!(this.selectName=== undefined)) {
                this.viz.nodes.forEach(node => {
                    if (node.label === this.selectName) {
                        this.network.setSelection({nodes: [node.id], edges: []});
                        this.selectName = undefined;
                    }
                })
            }
            if (this.settings.debug) {
                // @ts-ignore
                console.log(this.nodes);
                // @ts-ignore
                console.log(this.edges);
            }
        });
        this.load();
        this.viz.render();

        // Register on file open event
        this.workspace.on("file-open", (file) => {
            if (file && this.settings.auto_add_nodes) {
                const name = file.basename;
                //todo: Select node
                if (this.settings.auto_expand) {
                    this.updateWithCypher(this.plugin.localNeighborhoodCypher(name));
                }
                else {
                    this.updateWithCypher(this.plugin.nodeCypher(name));
                }
                this.selectName = name;
            }
        });

        // Register keypress event
        this.containerEl.addEventListener("keydown", (evt) => {
            if (evt.key === "e"){
                this.expandSelection();
            }
            else if (evt.key === "h" || evt.key === "Backspace"){
                this.hideSelection();
            }
            else if (evt.key === "i") {
                this.invertSelection();
            }
            else if (evt.key === "a") {
                this.selectAll();
            }
        });
    }

    findNodeRaw(id: IdType): Node {
        // @ts-ignore
        return this.viz.nodes.get(id)?.raw as Node;
    }

    findNode(id: IdType): INode {
        return this.viz.nodes.get(id) as INode;
    }

    findEdge(id: IdType): Relationship {
        // @ts-ignore
        return this.viz.edges.get(id)?.raw as Relationship;
    }

    updateWithCypher(cypher: string) {
        if (this.settings.debug) {
            console.log(cypher);
        }
        this.viz.updateWithCypher(cypher);
        this.rebuildRelations = true;
    }

    getFileFromNode(node: INode) {
        // @ts-ignore
        let label = node.raw.properties["name"];
        return this.app.metadataCache.getFirstLinkpathDest(label, '');
    }

    updateStyle() {
        let nodeOptions = JSON.parse(this.settings.nodeSettings);
        this.viz.nodes.forEach((node) => {
            let nodeId = this.network.findNode(node.id);

            let specificOptions: NodeOptions[] = [];
            let file = this.getFileFromNode(node);
            if (this.settings.community === "tags") {
                node.raw.labels.forEach((label) => {
                    if (label in nodeOptions) {
                        specificOptions.push(nodeOptions[label]);
                    }
                });
            }
            else if (this.settings.community === "folders" && !(file === undefined)) {
                // @ts-ignore
                const path = file.parent.path;
                if (path in nodeOptions) {
                    specificOptions.push(nodeOptions[path]);
                }
            }
            // Style images
            if (/(\.png|\.jpg|\.jpeg|\.gif|\.svg)$/.test(node.label) && !(file === undefined)) {
                specificOptions.push({shape: "image", image: "http://localhost:" +
                        this.settings.imgServerPort +  "/"
                        + encodeURI(file.path)});
                if ("image" in nodeOptions) {
                    specificOptions.push(nodeOptions["image"]);
                }
            }
            // @ts-ignore
            let node_sth = this.network.body.nodes[nodeId];
            if (!(node_sth === undefined)) {
                node_sth.setOptions(Object.assign({}, nodeOptions["defaultStyle"], ...specificOptions));
            } else if(this.settings.debug) {
                console.log(node);
            }
        });
        let edgeOptions = JSON.parse(this.settings.edgeSettings);
        this.viz.edges.forEach((edge) => {
            // @ts-ignore
            let edge_sth = this.network.body.edges[edge.id];
            let type = edge.raw.type;
            let specificOptions = type in edgeOptions ? [edgeOptions[type]] : [];
            if (!(edge_sth === undefined)) {
                edge_sth.setOptions(Object.assign({}, edgeOptions["defaultStyle"], ...specificOptions));
            } else if (this.settings.debug) {
                console.log(edge);
            }
        });
    }

    async onClickNode(node: INode) {
        const file = this.getFileFromNode(node);
        // @ts-ignore
        let label = node.raw.properties["name"];
        if (file) {
            await this.plugin.openFile(file);
        }
        else {
            // Create dangling file
            // TODO: Add default folder
            // @ts-ignore
            const filename = label + ".md";
            const createdFile = await this.vault.create(filename, '');
            await this.plugin.openFile(createdFile);
        }
        if (this.settings.auto_expand) {
            await this.updateWithCypher(this.plugin.localNeighborhoodCypher(label));
        }
    }

    async onDoubleClickNode(node: Node) {
        // @ts-ignore
        const label = node.properties["name"];
        this.expandedNodes.push(label);
        await this.updateWithCypher(this.plugin.localNeighborhoodCypher(label));
    }

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

    getInQuery(nodes: IdType[]): string {
        let query = "IN ["
        let first = true;
        for (let id of nodes) {
            // @ts-ignore
            const title = this.findNodeRaw(id).properties["name"] as string;
            if (!first) {
                query += ", ";
            }
            query += "\"" + title + "\"";
            first = false;
        }
        query += "]"
        return query;
    }

    async expandSelection() {
        let selected_nodes = this.network.getSelectedNodes();
        if (selected_nodes.length === 0) {
            return;
        }
        let query = "MATCH (n)-[r]-(m) WHERE n." + PROP_VAULT + "= \"" + this.vault.getName() + "\" AND n.name ";
        query += this.getInQuery(selected_nodes);
        query += " RETURN r,m";
        let expandedNodes = this.expandedNodes;
        selected_nodes.forEach(id => {
            // @ts-ignore
            const title = this.findNodeRaw(id).properties["name"] as string;
            if (!expandedNodes.includes(title)) {
                expandedNodes.push(title);
            }
        });
        this.updateWithCypher(query);
    }

    deleteNode(id: IdType) {
        // console.log(this.viz.nodes);
        // @ts-ignore

        let node = this.findNode(id) || this.nodes[id];
        if (node === undefined) {
            return;
        }
        // @ts-ignore
        const title = node.raw.properties["name"] as string;
        if (this.expandedNodes.includes(title)) {
            this.expandedNodes.remove(title);
        }
        let expandedNodes = this.expandedNodes;
        this.network.getConnectedNodes(id).forEach((value: any) => {
            this.findNodeRaw(value);
            // @ts-ignore
            const n_title = this.findNodeRaw(value).properties["name"] as string;
            if (expandedNodes.includes(n_title)) {
                expandedNodes.remove(n_title);
            }
        });

        let edges_to_remove: IEdge[] = [];
        this.viz.edges.forEach((edge) => {
            if (edge.from === id || edge.to === id) {
                edges_to_remove.push(edge);
            }
        });
        edges_to_remove.forEach(edge => {
            this.viz.edges.remove(edge);
        });

        this.viz.nodes.remove(id);

        let keys_to_remove = [];
        for (let key in this.edges) {
            let edge = this.edges[key];
            if (edge.to === id || edge.from === id) {
                keys_to_remove.push(key);
            }
        }
        keys_to_remove.forEach((key) => {
            // @ts-ignore
            delete this.edges[key];
        });

        delete this.nodes[id as number];
    }

    deleteEdge(id: IdType) {
        let edge = this.edges[id];
        if (edge === undefined) {
            return;
        }

        let nodes = [edge.from, edge.to];

        this.viz.edges.remove(edge);

        delete this.edges[id];

        // TODO: Check if the node deletion is using the right rule
        // Current rule: The connected nodes are not expanded, and also have no other edges.
        nodes.forEach(node_id => {
            let node = this.findNodeRaw(node_id);
            // @ts-ignore
            if (!this.expandedNodes.contains(node.properties["name"])
                && this.network.getConnectedEdges(node_id).length === 0) {
                this.deleteNode(node_id);
            }
        });
    }

    async hideSelection() {
        if (this.network.getSelectedNodes().length === 0) {
            return;
        }
        // Update expanded nodes. Make sure to not automatically expand nodes of which a neighbor was hidden.
        // Otherwise, one would have to keep hiding nodes.
        this.network.getSelectedNodes().forEach(id => {
            this.deleteNode(id);
        });
        // this.network.deleteSelected();

        // This super hacky code is used because neovis.js doesn't like me removing nodes from the graph.
        // Essentially, whenever it'd execute a new query, it'd re-add all hidden nodes!
        // This resets the state of NeoVis so that it only acts as an interface with neo4j instead of also keeping
        // track of the data.
        // @ts-ignore
        // let data = {nodes: this.viz.nodes, edges: this.viz.edges} as Data;
        // this.viz.clearNetwork();
        // this.network.setData(data);
        this.updateStyle();
    }

    invertSelection() {
        let selectedNodes = this.network.getSelectedNodes();
        let network = this.network;
        let inversion = this.viz.nodes.get({filter: function(item){
            return !selectedNodes.contains(item.id) && network.findNode(item.id).length > 0;
        }}).map((item) =>  item.id);
        this.network.setSelection({nodes: inversion, edges: []})
    }


    selectAll() {
        this.network.unselectAll();
        this.invertSelection();
    }

    async checkAndUpdate() {
        try {
            if(await this.checkActiveLeaf()) {
                await this.update();
            }
        } catch (error) {
            console.error(error)
        }
    }

    async update(){
        this.load();
    }

    async checkActiveLeaf() {
        return false;
    }

    getDisplayText(): string {
        return "Neo4j Graph";
    }

    getViewType(): string {
        return NV_VIEW_TYPE;
    }


}