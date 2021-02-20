import {App, PluginSettingTab, Setting, SplitDirection} from 'obsidian';

import type AdvancedGraphPlugin from './main';
import {OBSIDIAN_STORE_NAME} from './obsidian-store';
import AppearanceSettings from './ui/settings/AppearanceSettings.svelte';

export const LAYOUTS = ['force-directed', 'circle', 'grid', 'hierarchy', 'cola'];
export type FDGDLayouts = 'cola'| 'd3-force';
export type AGLayouts = 'force-directed' | 'circle' | 'grid' | 'hierarchy' | FDGDLayouts;

export interface IAdvancedGraphSettings {
    autoAddNodes: boolean;
    navigator: boolean;
    toolbar: boolean;
    coreStore: string;
    mergeEdges: boolean;
    mode: string;
    hoverEdges: boolean;
    autoExpand: boolean;
    autoZoom: boolean;
    layout: AGLayouts;
    fdgdLayout: FDGDLayouts;
    limit: number;
    filter: string;
}

export interface IAGEmbedSettings extends IAdvancedGraphSettings {
    width: string | number;
    height: string | number;
}

export interface IAGPluginSettings {
    // indexContent: boolean; // neo4j
    password: string; // neo4j
    typedLinkPrefix: string;
    splitDirection: SplitDirection; // 'horizontal';
    imgServerPort: number;
    debug: boolean;
    graphSettings: IAdvancedGraphSettings;
    embedSettings: IAGEmbedSettings;
}


export const DefaultAdvancedGraphSettings: IAGPluginSettings = {
  password: '',
  splitDirection: 'vertical',
  typedLinkPrefix: '-',
  imgServerPort: 3837,
  debug: false,
  graphSettings: {
    autoAddNodes: true,
    autoExpand: false,
    autoZoom: false,
    navigator: true,
    toolbar: true,
    hoverEdges: false,
    mergeEdges: true,
    coreStore: OBSIDIAN_STORE_NAME,
    mode: 'local',
    layout: 'force-directed',
    fdgdLayout: 'cola',
    // TODO: Not currently used anywhere
    limit: 10000,
    filter: '',
  },
  embedSettings: {
    autoAddNodes: false,
    autoExpand: false,
    autoZoom: false,
    toolbar: false,
    coreStore: OBSIDIAN_STORE_NAME,
    hoverEdges: false,
    mergeEdges: true,
    mode: 'local',
    navigator: false,
    layout: 'force-directed',
    fdgdLayout: 'cola',
    limit: 1000,
    filter: '',
    width: '100%',
    height: '400px',
  },
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
            toggle.setValue(this.plugin.settings.graphSettings.navigator)
                .onChange((newValue) => {
                  this.plugin.settings.graphSettings.navigator = newValue;
                  this.plugin.saveData(this.plugin.settings);
                });
          });

      new Setting(containerEl)
          .setName('Default mode')
          .setDesc('The default mode to open the Advanced Graph View in.')
          .addDropdown((dropdown) => {
            dropdown.addOption('local', 'Local Mode');
            dropdown.addOption('workspace', 'Workspace Mode');
            dropdown.setValue(this.plugin.settings.graphSettings.mode)
                .onChange((newValue) => {
                  this.plugin.settings.graphSettings.mode = newValue;
                  this.plugin.saveData(this.plugin.settings);
                });
          });

      new Setting(containerEl)
          .setName('Force-directed algorithm')
          .setDesc('The default force-directed graph drawing algorithm to use. ' +
                'Cola is nice, but unstable in some use cases. Obsidian uses D3')
          .addDropdown((dropdown) => {
            dropdown.addOption('cola', 'Cola');
            dropdown.addOption('d3-force', 'D3');
            dropdown.setValue(this.plugin.settings.graphSettings.fdgdLayout)
                .onChange((newValue: FDGDLayouts) => {
                  this.plugin.settings.graphSettings.fdgdLayout = newValue;
                  this.plugin.settings.embedSettings.fdgdLayout = newValue;
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
            dropdown.setValue(this.plugin.settings.graphSettings.coreStore)
                .onChange((newValue) => {
                  this.plugin.settings.graphSettings.coreStore = newValue;
                  this.plugin.settings.embedSettings.coreStore = newValue;
                  this.plugin.saveData(this.plugin.settings);
                });
          });
      containerEl.createEl('h4', {text: 'Workspace mode'});
      new Setting(containerEl)
          .setName('Automatically add nodes')
          .setDesc('This will automatically add nodes to the graph whenever a note is opened.')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.graphSettings.autoAddNodes)
                .onChange((new_value) => {
                  this.plugin.settings.graphSettings.autoAddNodes = new_value;
                  this.plugin.saveData(this.plugin.settings);
                });
          });
      new Setting(containerEl)
          .setName('Automatically zoom on active nodes')
          .setDesc('This will automatically keep fitting the viewport on the currently active node. ' +
                'In particular, this happens when you open a file.')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.graphSettings.autoZoom)
                .onChange((new_value) => {
                  this.plugin.settings.graphSettings.autoZoom = new_value;
                  this.plugin.saveData(this.plugin.settings);
                });
          });
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
            toggle.setValue(this.plugin.settings.graphSettings.hoverEdges)
                .onChange((new_value) => {
                  this.plugin.settings.graphSettings.hoverEdges = new_value;
                  this.plugin.settings.embedSettings.hoverEdges = new_value;
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