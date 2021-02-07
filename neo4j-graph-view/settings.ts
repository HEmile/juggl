import {App, PluginSettingTab, Setting, SplitDirection} from 'obsidian';

import type AdvancedGraphPlugin from './main';
import {OBSIDIAN_STORE_NAME} from './obsidian-store';
import AppearanceSettings from './ui/settings/AppearanceSettings.svelte';

export interface IAdvancedGraphSettings {
    indexContent: boolean; // neo4j
    autoExpand: boolean;
    autoAddNodes: boolean;
    navigator: boolean;
    password: string; // neo4j
    typedLinkPrefix: string;
    splitDirection: SplitDirection; // 'horizontal';
    imgServerPort: number;
    debug: boolean;
    coreStore: string;
    mergeEdges: boolean;
    defaultMode: string;
    hoverEdges: boolean;
}


export const DefaultAdvancedGraphSettings: IAdvancedGraphSettings = {
  autoAddNodes: true,
  autoExpand: false,
  indexContent: false,
  navigator: true,
  password: '',
  splitDirection: 'vertical',
  typedLinkPrefix: '-',
  imgServerPort: 3837,
  debug: false,
  coreStore: OBSIDIAN_STORE_NAME,
  mergeEdges: true,
  defaultMode: 'local',
  hoverEdges: false,
};


export class AdvancedGraphSettingTab extends PluginSettingTab {
    plugin: AdvancedGraphPlugin;
    constructor(app: App, plugin: AdvancedGraphPlugin) {
      super(app, plugin);
      this.plugin = plugin;
    }

    display(): void {
      const {containerEl} = this;
      containerEl.empty();

      containerEl.createEl('h3');
      containerEl.createEl('h3', {text: 'Advanced Graph View'});

      const doc_link = document.createElement('a');
      doc_link.href = 'https://publish.obsidian.md/semantic-obsidian/Neo4j+Graph+View+Plugin';
      doc_link.target = '_blank';
      doc_link.innerHTML = 'the documentation';

      const discord_link = document.createElement('a');
      discord_link.href = 'https://discord.gg/sAmSGpaPgM';
      discord_link.target = '_blank';
      discord_link.innerHTML = 'the Discord server';

      const introPar = document.createElement('p');
      introPar.innerHTML = 'Check out ' + doc_link.outerHTML + ' for guides on how to use the plugin. <br>' +
            'Join ' + discord_link.outerHTML + ' for help, nice discussion and insight into development.';

      containerEl.appendChild(introPar);

      new AppearanceSettings({target: containerEl, props: {plugin: this.plugin}});

      // new Setting(containerEl)
      //     .setName('Neo4j database password')
      //     .setDesc('The password of your neo4j graph database. WARNING: This is stored in plaintext in your vault. ' +
      //           'Don\'t use sensitive passwords here!')
      //     .addText((text) => {
      //       text.setPlaceholder('')
      //           .setValue(this.plugin.settings.password)
      //           .onChange((newFolder) => {
      //             this.plugin.settings.password = newFolder;
      //             this.plugin.saveData(this.plugin.settings);
      //           }).inputEl.setAttribute('type', 'password');
      //     });

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
          .setName('Default mode')
          .setDesc('The default mode to open the Advanced Graph View in.')
          .addDropdown((dropdown) => {
            dropdown.addOption('local', 'Local Mode');
            dropdown.addOption('workspace', 'Workspace Mode');
            dropdown.setValue(this.plugin.settings.defaultMode)
                .onChange((newValue) => {
                  this.plugin.settings.defaultMode = newValue;
                  this.plugin.saveData(this.plugin.settings);
                });
          });


      new Setting(containerEl)
          .setName('Data store')
          .setDesc('Set what database to get the Obsidian graph from. By default, only Obsidian itself is an option. ' +
                'Later on, you will be able to install the Neo4j Stream Plugin to use a Neo4j backend which has more features and scales better to large graphs.')
          .addDropdown((dropdown) => {
            Object.keys(this.plugin.coreStores).forEach((c) => {
              dropdown.addOption(c, c);
            });
            dropdown.setValue(this.plugin.settings.coreStore)
                .onChange((newValue) => {
                  this.plugin.settings.coreStore = newValue;
                  this.plugin.saveData(this.plugin.settings);
                });
          });

      containerEl.createEl('h3');
      containerEl.createEl('h3', {text: 'Advanced'});

      // Not currently implemented
      // new Setting(containerEl)
      //     .setName('Automatic expand')
      //     .setDesc('This will automatically expand the neighbourhood around any nodes clicked on or added to the graph. ' +
      //           'This normally only happens when pressing E or when double-clicking.')
      //     .addToggle((toggle) => {
      //       toggle.setValue(this.plugin.settings.autoExpand)
      //           .onChange((new_value) => {
      //             this.plugin.settings.autoExpand = new_value;
      //             this.plugin.saveData(this.plugin.settings);
      //           });
      //     });
      new Setting(containerEl)
          .setName('Hover on edges')
          .setDesc('Hover on edges to show what they are connected to..')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.hoverEdges)
                .onChange((new_value) => {
                  this.plugin.settings.hoverEdges = new_value;
                  this.plugin.saveData(this.plugin.settings);
                });
          });

      new Setting(containerEl)
          .setName('Automatically add nodes')
          .setDesc('This will automatically add nodes to the graph whenever a note is opened in workspace mode.')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.autoAddNodes)
                .onChange((new_value) => {
                  this.plugin.settings.autoAddNodes = new_value;
                  this.plugin.saveData(this.plugin.settings);
                });
          });

      // new Setting(containerEl)
      //     .setName('Index note content')
      //     .setDesc('This will full-text index the content of notes. ' +
      //           'This allows searching within notes using the Neo4j Bloom search bar. However, it could decrease performance.')
      //     .addToggle((toggle) => {
      //       toggle.setValue(this.plugin.settings.indexContent)
      //           .onChange((new_value) => {
      //             this.plugin.settings.indexContent = new_value;
      //             this.plugin.saveData(this.plugin.settings);
      //           });
      //     });

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
          .setDesc('Set the port of the image server. If you use multiple vaults, these need to be set differently. Default 3837.')
          .addText((text) => {
            text.setValue(this.plugin.settings.imgServerPort + '')
                .setPlaceholder('3837')
                .onChange((new_value) => {
                  this.plugin.settings.imgServerPort = parseInt(new_value.trim());
                  this.plugin.saveData(this.plugin.settings);
                });
          });

      new Setting(containerEl)
          .setName('Debug')
          .setDesc('Enable debug mode, which prints a lot of stuff in the developers console.')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.debug)
                .onChange((new_value) => {
                  this.plugin.settings.debug = new_value;
                  this.plugin.saveData(this.plugin.settings);
                });
          });
    }
}
