// import NeoVis from 'neovis.js/dist/neovis.js';
import {NEOVIS_DEFAULT_CONFIG} from "neovis.js";
import NeoVis from 'neovis.js';
import {SemanticMarkdownSettings} from "./settings";
import {EventRef, ItemView, MarkdownView, Workspace, WorkspaceLeaf} from "obsidian";

export const NV_VIEW_TYPE = "neovis";
export const MD_VIEW_TYPE = 'markdown';

export class NeoVisView extends ItemView{

    workspace: Workspace;
    listeners: EventRef[];
    settings: SemanticMarkdownSettings;
    initial_note: string;

    constructor(leaf: WorkspaceLeaf, settings: SemanticMarkdownSettings, active_note: string) {
        super(leaf);
        this.settings = settings;
        this.workspace = this.app.workspace;
        this.initial_note = active_note;
    }

    async onOpen() {
        this.registerInterval(window.setInterval(()=> this.checkAndUpdate));
        this.listeners = [
            this.workspace.on('layout-ready', () => this.update()),
            this.workspace.on('resize', () => this.update()),
            this.workspace.on('css-change', () => this.update()),
            // this.leaf.on('group-change', (group) => this.updateLinkedLeaf(group, this))
        ];



        const div = document.createElement("div");
        div.id = "neovis_id";
        this.containerEl.children[1].appendChild(div);
        div.setAttr("style", "height: 100%; width:100%");
        console.log('changed');
        console.log(this.containerEl);
        console.log(this.leaf);
        var config = {
            container_id: "neovis_id",
            server_url: "bolt://localhost:7687",
            server_user: "neo4j",
            server_password: this.settings.password  ,
            arrows: true, // TODO: ADD CONFIG
            labels: {
                //"Character": "name",
                "SMD_no_tags": {
                    "caption": "name",
                    "size": "pagerank",
                    // "font": "???" # Use css for this
                    // "community": "community", # Should default to color by label
                    //"image": 'https://visjs.org/images/visjs_logo.png',
                    "title_properties": [
                        "name",
                        "aliases"
                    ],
                    //"sizeCypher": "MATCH (n) WHERE id(n) = {id} MATCH (n)-[r]-() RETURN sum(r.weight) AS c"
                },
                [NEOVIS_DEFAULT_CONFIG]: {
                    "caption": "name",
                    "size": "pagerank",
                    "community": "defaultCommunity",
                    "title_properties": [
                        "name",
                        "aliases"
                    ],
                    //"sizeCypher": "defaultSizeCypher"

                }
            },
            relationships: {
                "inline": {
                    "thickness": "weight",
                    "caption": false
                },
                [NEOVIS_DEFAULT_CONFIG]: {
                    "thickness": "defaultThicknessProperty",
                    "caption": true
                }
            },
            initial_cypher: "MATCH (n)-[r]-(m) WHERE n.name=\"" + this.initial_note + "\" RETURN n,r,m"
        };
        console.log(this.containerEl.id);
        let viz = new NeoVis(config);

        viz.registerOnEvent("completed", (e)=>{
            // @ts-ignore
            console.log(viz["_network"]);
            // @ts-ignore
            viz["_network"].on("click", (event)=>{
                let node = viz.nodes.get(event.nodes[0]);
                console.log(node);
                // TODO: add community and path properties to smds

                // @ts-ignore
                const note_name = node.label;
                // const view = this.workspace.getLeavesOfType(MD_VIEW_TYPE);
                // let leaf = view[0];
                // let file = this.app.vault.getMarkdownFiles().
            });
        });
        console.log("rendering")
        this.load();
        viz.render();
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
        // if(this.filePath) {
        //     await this.readMarkDown();
        //     if(this.currentMd.length === 0 || this.getLeafTarget().view.getViewType() != MD_VIEW_TYPE){
        //         this.displayEmpty(true);
        //         removeExistingSVG();
        //     } else {
        //         const { root, features } = await this.transformMarkdown();
        //         this.displayEmpty(false);
        //         this.svg = createSVG(this.containerEl, this.settings.lineHeight);
        //         this.renderMarkmap(root, this.svg);
        //     }
        // }
        // this.displayText = this.fileName != undefined ? `Mind Map of ${this.fileName}` : 'Mind Map';

        this.load();
    }

    async checkActiveLeaf() {
        // TODO: Wait for callbacks in python
        // if(this.app.workspace.activeLeaf.view.getViewType() === MM_VIEW_TYPE){
        //     return false;
        // }
        // const markDownHasChanged = await this.readMarkDown();
        // const updateRequired = markDownHasChanged;
        return false;
    }

    getDisplayText(): string {
        return "Graph";
    }

    getViewType(): string {
        return NV_VIEW_TYPE;
    }
}