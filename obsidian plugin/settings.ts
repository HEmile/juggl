import {App, Notice, PluginSettingTab, Setting, SplitDirection} from "obsidian";

import SemanticMarkdownPlugin from './main';

export class SemanticMarkdownSettings {
    index_content = false;
    auto_expand = true;
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
            .setDesc("The password of your neo4j graph database.")
            .addText(text => {
                text.setPlaceholder("")
                    .setValue(this.plugin.settings.password)
                    .onChange((new_folder) => {
                        this.plugin.settings.password = new_folder;
                        this.plugin.saveData(this.plugin.settings);
                    }).inputEl.setAttribute("type", "password")
            });

        new Setting(containerEl)
            .setName("Automatic expand")
            .setDesc("This will automatically expand the neighbourhood around any nodes clicked on.")
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.auto_expand)
                    .onChange((new_value) => {
                        this.plugin.settings.auto_expand = new_value;
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