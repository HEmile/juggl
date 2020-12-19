// import NeoVis from 'neovis.js/dist/neovis.js';
import {NEOVIS_DEFAULT_CONFIG} from "neovis.js";
import NeoVis from 'neovis.js';
import {SemanticMarkdownSettings} from "./settings";
import {EventRef, ItemView, MarkdownView, normalizePath, TFile, Vault, Workspace, WorkspaceLeaf} from "obsidian";
import SemanticMarkdownPlugin from "./main";

export const NV_VIEW_TYPE = "neovis";
export const MD_VIEW_TYPE = 'markdown';

export const PROP_VAULT = "SMD_vault"
export const PROP_PATH = "SMD_path"
export const PROP_COMMUNITY = "SMD_community"

export class NeoVisView extends ItemView{

    workspace: Workspace;
    listeners: EventRef[];
    settings: SemanticMarkdownSettings;
    initial_note: string;
    vault: Vault;
    plugin: SemanticMarkdownPlugin;
    viz: NeoVis;
    hasClickListener = false;

    constructor(leaf: WorkspaceLeaf, active_note: string, plugin: SemanticMarkdownPlugin) {
        super(leaf);
        console.log(leaf);
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
        console.log(this.containerEl);
        const config = {
            container_id: "neovis_id",
            server_url: "bolt://localhost:7687",
            server_user: "neo4j",
            server_password: this.settings.password,
            arrows: true, // TODO: ADD CONFIG
            labels: {
                [NEOVIS_DEFAULT_CONFIG]: {
                    "caption": "name",
                    "size": "pagerank",
                    "community": PROP_COMMUNITY,
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
            initial_cypher: this.settings.auto_expand ?
                this.localNeighborhoodCypher(this.initial_note) :
                this.nodeCypher(this.initial_note)
        };
        this.viz = new NeoVis(config);
        this.viz.registerOnEvent("completed", (e)=>{
            console.log("onCompleted");
            if (!this.hasClickListener) {
                // @ts-ignore
                this.viz["_network"].on("click", (event) => {
                    console.log("onClick");
                    this.onClickNode(this.viz.nodes.get(event.nodes[0]));
                });
                this.hasClickListener = true;
            }
        });
        console.log("rendering")
        this.load();
        this.viz.render();

        this.workspace.on("file-open", (file) => {
            if (this.settings.auto_add_nodes) {
                console.log(file.basename);
                console.log(file.name);
                const name = file.name;
                if (this.settings.auto_expand) {
                    this.viz.updateWithCypher(this.localNeighborhoodCypher(name));
                }
                else {
                    this.viz.updateWithCypher(this.nodeCypher(name));
                }
            }
        });

        // this.app.o
    }

    nodeCypher(label: string): string {
        return "MATCH (n) WHERE n.name=\"" + label +
            "\" AND n." + PROP_VAULT + "=\"" + this.vault.getName() +
            "\" RETURN n"
    }

    localNeighborhoodCypher(label:string): string {
        return "MATCH (n)-[r]-(m) WHERE n.name=\"" + label +
            "\" AND n." + PROP_VAULT + "=\"" + this.vault.getName() +
            "\" RETURN n,r,m"
    }

    async onClickNode(node: Object) {
        // @ts-ignore
        if (!node.raw) {
            return;
        }
        // @ts-ignore
        const file = node.raw.properties[PROP_PATH];
        // @ts-ignore
        const label = node.label;
        if (file) {
            const tfile = this.plugin.getFileFromAbsolutePath(file) as TFile;
            await this.plugin.openFile(tfile)
        }
        else {
            // Create dangling file
            // TODO: Add default folder
            const filename = label + ".md";
            const createdFile = await this.vault.create(filename, '');
            await this.plugin.openFile(createdFile);
        }
        if (this.settings.auto_expand) {
            console.log(this.localNeighborhoodCypher(label));
            await this.viz.updateWithCypher(this.localNeighborhoodCypher(label));
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
        return "Neo4j Graph";
    }

    getViewType(): string {
        return NV_VIEW_TYPE;
    }
}