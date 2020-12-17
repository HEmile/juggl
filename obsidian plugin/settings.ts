import {Notice, PluginSettingTab, Setting, SplitDirection} from "obsidian";

import SemanticMarkdownPlugin from './main';

export class SemanticMarkdownSettings {
    index_content = false;
    password = "";
    splitDirection: SplitDirection = 'horizontal';
}

export class SemanticMarkdownSettingTab extends PluginSettingTab {
    display(): void {
        const plugin: SemanticMarkdownPlugin = (this as any).pluginn;
        let {containerEl} = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName("Neo4j database password")
            .setDesc("The password of your neo4j graph database.")
            .addText(text => {
                text.setPlaceholder("")
                    .setValue(plugin.settings.password)
                    .onChange((new_folder) => {
                        plugin.settings.password = new_folder;
                        plugin.saveData(plugin.settings);
                    }).inputEl.setAttribute("type", "password")
            });

        new Setting(containerEl)
            .setName("Index note content")
            .setDesc("This will full-text index the content of notes. " +
                "This allows searching within notes using the Neo4j Bloom search bar. However, it could decrease performance.")
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.index_content)
                    .onChange((new_value) => {
                        plugin.settings.index_content = new_value;
                        plugin.saveData(plugin.settings);
                    })
            });


    }
}