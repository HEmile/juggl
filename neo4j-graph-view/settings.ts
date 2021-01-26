import {App, Notice, PluginSettingTab, Setting, SplitDirection} from 'obsidian';

import Neo4jViewPlugin from './main';
// import {EdgeOptions, NodeOptions} from 'vis-network';
import {AdvancedGraphView, AG_VIEW_TYPE} from './visualization';

export interface IAdvancedGraphSettings {
    indexContent: boolean; // neo4j
    autoExpand: boolean;
    autoAddNodes: boolean;
    hierarchical: boolean;
    navigator: boolean;
    password: string; // neo4j
    typedLinkPrefix: string;
    splitDirection: SplitDirection; // 'horizontal';
    imgServerPort: number;
    debug: boolean;
}


export const DefaultNeo4jViewSettings: IAdvancedGraphSettings = {
  autoAddNodes: true,
  autoExpand: false,
  hierarchical: false,
  indexContent: false,
  navigator: true,
  password: '',
  splitDirection: 'vertical',
  typedLinkPrefix: '-',
  imgServerPort: 3837,
  debug: false,
};


export class Neo4jViewSettingTab extends PluginSettingTab {
    plugin: Neo4jViewPlugin;
    constructor(app: App, plugin: Neo4jViewPlugin) {
      super(app, plugin);
      this.plugin = plugin;
    }

    display(): void {
      const {containerEl} = this;
      containerEl.empty();

      containerEl.createEl('h3');
      containerEl.createEl('h3', {text: 'Neo4j Graph View'});

      const doc_link = document.createElement('a');
      doc_link.href = 'https://publish.obsidian.md/semantic-obsidian/Neo4j+Graph+View+Plugin';
      doc_link.target = '_blank';
      doc_link.innerHTML = 'the documentation';

      const discord_link = document.createElement('a');
      discord_link.href = 'https://discord.gg/sAmSGpaPgM';
      discord_link.target = '_blank';
      discord_link.innerHTML = 'the Discord server';

      const introPar = document.createElement('p');
      introPar.innerHTML = 'Check out ' + doc_link.outerHTML + ' for installation help and a getting started guide. <br>' +
            'Join ' + discord_link.outerHTML + ' for nice discussion and additional help.';

      containerEl.appendChild(introPar);

      new Setting(containerEl)
          .setName('Neo4j database password')
          .setDesc('The password of your neo4j graph database. WARNING: This is stored in plaintext in your vault. ' +
                'Don\'t use sensitive passwords here!')
          .addText((text) => {
            text.setPlaceholder('')
                .setValue(this.plugin.settings.password)
                .onChange((newFolder) => {
                  this.plugin.settings.password = newFolder;
                  this.plugin.saveData(this.plugin.settings);
                }).inputEl.setAttribute('type', 'password');
          });

      containerEl.createEl('h3');
      containerEl.createEl('h3', {text: 'Extensions'});
      new Setting(containerEl)
          .setName('Use navigator')
          .setDesc('Use the navigator overview in the bottom-right corner. Disabling could improve performance.')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.navigator)
                .onChange((newValue) => {
                  this.plugin.settings.navigator = newValue;
                  this.plugin.saveData(this.plugin.settings);
                });
          });

      new Setting(containerEl)
          .setName('Hierarchical layout')
          .setDesc('Use the hierarchical graph layout instead of the normal one.')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.hierarchical)
                .onChange((newValue) => {
                  this.plugin.settings.hierarchical = newValue;
                  this.plugin.saveData(this.plugin.settings);
                });
          });


      containerEl.createEl('h3');
      containerEl.createEl('h3', {text: 'Advanced'});

      new Setting(containerEl)
          .setName('Automatic expand')
          .setDesc('This will automatically expand the neighbourhood around any nodes clicked on or added to the graph. ' +
                'This normally only happens when pressing E or when double-clicking.')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.autoExpand)
                .onChange((new_value) => {
                  this.plugin.settings.autoExpand = new_value;
                  this.plugin.saveData(this.plugin.settings);
                });
          });
      new Setting(containerEl)
          .setName('Automatically add nodes')
          .setDesc('This will automatically add nodes to the graph whenever a note is opened.')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.autoAddNodes)
                .onChange((new_value) => {
                  this.plugin.settings.autoAddNodes = new_value;
                  this.plugin.saveData(this.plugin.settings);
                });
          });

      new Setting(containerEl)
          .setName('Index note content')
          .setDesc('This will full-text index the content of notes. ' +
                'This allows searching within notes using the Neo4j Bloom search bar. However, it could decrease performance.')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.indexContent)
                .onChange((new_value) => {
                  this.plugin.settings.indexContent = new_value;
                  this.plugin.saveData(this.plugin.settings);
                });
          });

      new Setting(containerEl)
          .setName('Typed links prefix')
          .setDesc('Prefix to use for typed links. Default is \'-\'. Requires a server restart.')
          .addText((text) => {
            text.setPlaceholder('')
                .setValue(this.plugin.settings.typedLinkPrefix)
                .onChange((new_folder) => {
                  this.plugin.settings.typedLinkPrefix = new_folder;
                  this.plugin.saveData(this.plugin.settings);
                });
          });

      new Setting(containerEl)
          .setName('Image server port')
          .setDesc('Set the port of the image server. If you use multiple vaults, these need to be set differently. Default 3000.')
          .addText((text) => {
            text.setValue(this.plugin.settings.imgServerPort + '')
                .setPlaceholder('3000')
                .onChange((new_value) => {
                  this.plugin.settings.imgServerPort = parseInt(new_value.trim());
                  this.plugin.saveData(this.plugin.settings);
                });
          });

      new Setting(containerEl)
          .setName('Debug')
          .setDesc('Enable debug mode. Prints a lot of stuff in the developers console. Requires a server restart.')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.debug)
                .onChange((new_value) => {
                  this.plugin.settings.debug = new_value;
                  this.plugin.saveData(this.plugin.settings);
                });
          });
    }
}
