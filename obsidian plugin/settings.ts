import {App, Notice, PluginSettingTab, Setting, SplitDirection} from "obsidian";

import Neo4jViewPlugin from './main';

export interface INeo4jViewSettings {
    index_content: boolean;
    auto_expand: boolean;
    auto_add_nodes: boolean;
    community: string;
    hierarchical: boolean;
    show_arrows: boolean;
    password: string;
    typed_link_prefix: string;
    splitDirection: SplitDirection; // 'horizontal';
    debug: boolean;
}

export const DefaultNeo4jViewSettings: INeo4jViewSettings = {
    auto_add_nodes: true,
    auto_expand: false,
    hierarchical: false,
    index_content: false,
    community: "tags",
    password: "",
    show_arrows: true,
    splitDirection: 'horizontal',
    typed_link_prefix: '-',
    debug: false
}

export class Neo4jViewSettingTab extends PluginSettingTab {
    plugin: Neo4jViewPlugin;
    constructor(app: App, plugin: Neo4jViewPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let {containerEl} = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName("Neo4j database password")
            .setDesc("The password of your neo4j graph database. WARNING: This is stored in plaintext in your vault. " +
                "Don't use sensitive passwords here!")
            .addText(text => {
                text.setPlaceholder("")
                    .setValue(this.plugin.settings.password)
                    .onChange((new_folder) => {
                        this.plugin.settings.password = new_folder;
                        this.plugin.saveData(this.plugin.settings);
                    }).inputEl.setAttribute("type", "password")
            });

        new Setting(containerEl)
            .setName("Color-coding")
            .setDesc("What property to choose for coloring the nodes in the graph.")
            .addDropdown(dropdown => dropdown
                .addOption('tags','Tags')
                .addOption('folders','Folders')
                .addOption('none','No color-coding')
                .setValue(this.plugin.settings.community)
                .onChange((value) => {
                    this.plugin.settings.community = value;
                    this.plugin.saveData(this.plugin.settings);
                }));


        new Setting(containerEl)
            .setName("Hierarchical layout")
            .setDesc("Use the hierarchical graph layout instead of the normal one.")
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.hierarchical)
                    .onChange((new_value) => {
                        this.plugin.settings.hierarchical = new_value;
                        this.plugin.saveData(this.plugin.settings);
                    })
            });

        new Setting(containerEl)
            .setName("Show arrows")
            .setDesc("Show arrows on edges.")
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.show_arrows)
                    .onChange((new_value) => {
                        this.plugin.settings.show_arrows = new_value;
                        this.plugin.saveData(this.plugin.settings);
                    })
            });

        new Setting(containerEl)
            .setName("Automatic expand")
            .setDesc("This will automatically expand the neighbourhood around any nodes clicked on or added to the graph. " +
                "This normally only happens when pressing E or when double-clicking.")
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.auto_expand)
                    .onChange((new_value) => {
                        this.plugin.settings.auto_expand = new_value;
                        this.plugin.saveData(this.plugin.settings);
                    })
            });
        new Setting(containerEl)
            .setName("Automatically add nodes")
            .setDesc("This will automatically add nodes to the graph whenever a note is opened.")
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.auto_add_nodes)
                    .onChange((new_value) => {
                        this.plugin.settings.auto_add_nodes = new_value;
                        this.plugin.saveData(this.plugin.settings);
                    })
            });

        new Setting(containerEl)
            .setName("Index note content")
            .setDesc("This will full-text index the content of notes. " +
                "This allows searching within notes using the Neo4j Bloom search bar. However, it could decrease performance.")
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.index_content)
                    .onChange((new_value) => {
                        this.plugin.settings.index_content = new_value;
                        this.plugin.saveData(this.plugin.settings);
                    })
            });

        new Setting(containerEl)
            .setName("Typed links prefix")
            .setDesc("Prefix to use for typed links. Default is '-'.")
            .addText(text => {
                text.setPlaceholder("")
                    .setValue(this.plugin.settings.typed_link_prefix)
                    .onChange((new_folder) => {
                        this.plugin.settings.typed_link_prefix = new_folder;
                        this.plugin.saveData(this.plugin.settings);
                    })
            });

        new Setting(containerEl)
            .setName("Debug")
            .setDesc("Enable debug mode. Prints a lot of stuff in the developers console.")
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.debug)
                    .onChange((new_value) => {
                        this.plugin.settings.debug = new_value;
                        this.plugin.saveData(this.plugin.settings);
                    })
            });


    }
}