import {App, Notice, PluginSettingTab, Setting, SplitDirection} from "obsidian";

import SemanticMarkdownPlugin from './main';

export class SemanticMarkdownSettings {
    index_content = false;
    auto_expand = false;
    auto_add_nodes = true;
    hierarchical = false;
    show_arrows = true;
    password = "";
    splitDirection: SplitDirection = 'horizontal';
}

export class SemanticMarkdownSettingTab extends PluginSettingTab {
    plugin: SemanticMarkdownPlugin;
    constructor(app: App, plugin: SemanticMarkdownPlugin) {
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


    }
}