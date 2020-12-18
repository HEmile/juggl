// import NeoVis from 'neovis.js/dist/neovis.js';
import {NEOVIS_DEFAULT_CONFIG} from "neovis.js";
import NeoVis from 'neovis.js';
import {SemanticMarkdownSettings} from "./settings";
import {EventRef, ItemView, MarkdownView, normalizePath, TFile, Vault, Workspace, WorkspaceLeaf} from "obsidian";
import SemanticMarkdownPlugin from "./main";

export const NV_VIEW_TYPE = "neovis";
export const MD_VIEW_TYPE = 'markdown';

export class NeoVisView extends ItemView{

    workspace: Workspace;
    listeners: EventRef[];
    settings: SemanticMarkdownSettings;
    initial_note: string;
    vault: Vault;
    plugin: SemanticMarkdownPlugin;

    constructor(leaf: WorkspaceLeaf, active_note: string, plugin: SemanticMarkdownPlugin) {
        super(leaf);
        this.settings = plugin.settings;
        this.workspace = this.app.workspace;
        this.initial_note = active_note;
        this.vault = this.app.vault;
        this.plugin = plugin;
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
        const config = {
            container_id: "neovis_id",
            server_url: "bolt://localhost:7687",
            server_user: "neo4j",
            server_password: this.settings.password,
            arrows: true, // TODO: ADD CONFIG
            labels: {
                //"Character": "name",
                // "SMD_no_tags": {
                //     "caption": "name",
                //     "size": "pagerank",
                //     // "font": "???" # Use css for this
                //     // "community": "community", # Should default to color by label
                //     //"image": 'https://visjs.org/images/visjs_logo.png',
                //     "title_properties": [
                //         "aliases",
                //         "content"
                //     ],
                //     //"sizeCypher": "MATCH (n) WHERE id(n) = {id} MATCH (n)-[r]-() RETURN sum(r.weight) AS c"
                // },
                [NEOVIS_DEFAULT_CONFIG]: {
                    "caption": "name",
                    "size": "pagerank",
                    "community": "community",
                    "title_properties": [
                        "aliases",
                        "content"
                    ],
                    "font": {
                        "size": 26
                    }
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
                this.onClickNode(viz.nodes.get(event.nodes[0]));
            });
        });
        console.log("rendering")
        this.load();
        viz.render();

        // this.app.o
    }

    async onClickNode(node: Object) {
        // @ts-ignore
        const file = node.raw.properties["path"];
        if (file) {
            const tfile = this.plugin.getFileFromAbsolutePath(file) as TFile;
            await this.plugin.openFile(tfile)
        }
        else {
            // Create dangling file
            // TODO: Add default folder
            // @ts-ignore
            const filename = node.label + ".md";
            const createdFile = await this.vault.create(filename, '');
            await this.plugin.openFile(createdFile);
        }
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