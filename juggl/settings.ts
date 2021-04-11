import {App, PluginSettingTab, Setting, SplitDirection, TagCache} from 'obsidian';

import type JugglPlugin from './main';
import {OBSIDIAN_STORE_NAME} from './obsidian-store';
import AppearanceSettings from './ui/settings/AppearanceSettings.svelte';
import type {LayoutOptions} from 'cytoscape';

export const LAYOUTS = ['force-directed', 'circle', 'grid', 'hierarchy', 'cola'];
export type FDGDLayouts = 'cola'| 'd3-force';
export type JugglLayouts = 'force-directed' | 'circle' | 'grid' | 'hierarchy' | FDGDLayouts;
export type CytoscapeLayouts = FDGDLayouts | 'concentric' | 'grid' | 'dagre';
export type AllLayouts = CytoscapeLayouts | JugglLayouts;
import KoFi from './ui/KoFi.svelte';
import type {StyleGroup} from './viz/stylesheet';

export const emptyStyleGroup: StyleGroup = {filter: '',
  color: 'black',
  shape: 'ellipse',
  icon: {name: 'No icon', path: '', color: 'white'},
  showInPane: true,
  show: true,
  size: 1.0};
export const genStyleGroups = function(plugin: JugglPlugin): StyleGroup[] {
  const tagColorMap = {} as Record<string, string>;

  const colorSet = [[
    '#0089BA',
    '#2C73D2',
    '#008E9B',
    '#0081CF',
    '#008F7A',
    '#008E9B', // This one is double oops!
  ], [
    '#D65DB1',
    '#0082C1',
    '#9270D3',
    '#007F93',
    '#007ED9',
    '#007660',
  ], [
    '#FF9671',
    '#A36AAA',
    '#F27D88',
    '#6967A9',
    '#D26F9D',
    '#1b6299',
  ], [
    '#FFC75F',
    '#4C9A52',
    '#C3BB4E',
    '#00855B',
    '#88AC4B',
    '#006F61',
  ], [
    '#FF6F91',
    '#6F7F22',
    '#E07250',
    '#257A3E',
    '#AC7C26',
    '#006F5F',
  ], [
    '#F9F871',
    '#2FAB63',
    '#B8E067',
    '#008E63',
    '#78C664',
    '#007160',
  ]];
  const colors: string[] = [];
  for (const i of Array(6).keys()) {
    for (const j of Array(6).keys()) {
      colors.push(colorSet[j][i]);
    }
  }
  let tagsIter = 0;
  for (const file of plugin.vault.getMarkdownFiles()) {
    const cache = plugin.metadata.getFileCache(file);
    if (cache?.tags) {
      cache.tags.forEach((t:TagCache) => {
        const tag = t.tag.slice(1);
        const hSplit = tag.split('/');
        const tags = [];
        for (const i in hSplit) {
          const hTag = hSplit.slice(0, parseInt(i) + 1).join('-');
          tags.push(hTag);
        }
        for (const tag of tags) {
          if (!(tag in tagColorMap)) {
            tagColorMap[tag] = colors[tagsIter];
            tagsIter += 1;
            if (tagsIter >= colors.length) {
              tagsIter = 0;
            }
          }
        }
      });
    }
  }

  const genSheet: StyleGroup[] = [];
  for (const tag of Object.keys(tagColorMap)) {
    genSheet.push({filter: `tag:#${tag}`,
      color: tagColorMap[tag],
      shape: 'ellipse',
      icon: {name: 'No icon', path: '', color: 'white'},
      showInPane: true,
      show: true,
      size: 1.0});
  }
  return genSheet;
};
export interface IJugglSettings {
    autoAddNodes: boolean;
    autoExpand: boolean;
    autoZoom: boolean;
    coreStore: string;
    expandInitial: boolean;
    fdgdLayout: FDGDLayouts ;
    filter: string;
    height: string | number;
    hoverEdges: boolean;
    layout: JugglLayouts | LayoutOptions;
    limit: number;
    mergeEdges: boolean;
    mode: string;
    navigator: boolean;
    openWithShift: boolean;
    styleGroups: StyleGroup[];
    toolbar: boolean;
    width: string | number;
    zoomSpeed: number;
}


export interface IJugglPluginSettings {
    // indexContent: boolean; // neo4j
    password: string; // neo4j
    typedLinkPrefix: string;
    splitDirection: SplitDirection; // 'horizontal';
    imgServerPort: number;
    debug: boolean;
    graphSettings: IJugglSettings;
    globalgraphSettings: IJugglSettings;
    embedSettings: IJugglSettings;
    globalStyleGroups: StyleGroup[];
}


export const DefaultJugglSettings: IJugglPluginSettings = {
  password: '',
  splitDirection: 'vertical',
  typedLinkPrefix: '-',
  imgServerPort: 3837,
  debug: false,
  globalStyleGroups: [],
  graphSettings: {
    // TODO: Not currently used anywhere
    autoAddNodes: true,
    autoExpand: false,
    autoZoom: false,
    coreStore: OBSIDIAN_STORE_NAME,
    expandInitial: true,
    fdgdLayout: 'cola',
    filter: '',
    height: '100%',
    hoverEdges: false,
    layout: 'force-directed',
    limit: 10000,
    mergeEdges: true,
    mode: 'local',
    navigator: true,
    openWithShift: false,
    styleGroups: [],
    toolbar: true,
    width: '100%',
    zoomSpeed: 1,
  },
  embedSettings: {
    autoAddNodes: false,
    autoExpand: false,
    autoZoom: false,
    coreStore: OBSIDIAN_STORE_NAME,
    expandInitial: true,
    fdgdLayout: 'cola',
    filter: '',
    height: '400px',
    hoverEdges: false,
    layout: 'force-directed',
    limit: 1000,
    mergeEdges: true,
    mode: 'local',
    navigator: false,
    openWithShift: false,
    styleGroups: [],
    toolbar: false,
    width: '100%',
    zoomSpeed: 1,
  },
  globalgraphSettings: {
    autoAddNodes: true,
    autoExpand: false,
    autoZoom: false,
    coreStore: OBSIDIAN_STORE_NAME,
    expandInitial: false,
    fdgdLayout: 'cola',
    filter: '-class:dangling -class:file',
    height: '100%',
    width: '100%',
    limit: 10000,
    hoverEdges: false,
    layout: 'force-directed',
    mergeEdges: true,
    mode: 'workspace',
    navigator: true,
    openWithShift: false,
    styleGroups: [],
    toolbar: true,
    zoomSpeed: 1,
  },
};


export class JugglGraphSettingsTab extends PluginSettingTab {
    plugin: JugglPlugin;
    constructor(app: App, plugin: JugglPlugin) {
      super(app, plugin);
      this.plugin = plugin;
    }

    display(): void {
      const {containerEl} = this;
      containerEl.empty();

      containerEl.createEl('h3');
      containerEl.createEl('h3', {text: 'Juggl'});

      new KoFi({target: containerEl});

      const doc_link = document.createElement('a');
      doc_link.href = 'https://publish.obsidian.md/semantic-obsidian/Neo4j+Graph+View+Plugin';
      doc_link.target = '_blank';
      doc_link.innerHTML = 'the documentation';

      const discord_link = document.createElement('a');
      discord_link.href = 'https://discord.gg/sAmSGpaPgM';
      discord_link.target = '_blank';
      discord_link.innerHTML = 'the Discord server';

      const introPar = document.createElement('p');
      introPar.innerHTML =
          'Check out ' + doc_link.outerHTML + ' for guides on how to use the plugin. <br>' +
            'Join ' + discord_link.outerHTML + ' for help, nice discussion and insight into development.';

      containerEl.appendChild(introPar);

      new AppearanceSettings({target: containerEl, props: {plugin: this.plugin}});

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
      new Setting(containerEl)
          .setName('Zoom speed')
          .setDesc('Speed with which zooming in and out happens. ' +
              'A value of 1 is recommended, but can be too quick for some mice.')
          .addSlider((slider) => {
            slider
                .setDynamicTooltip()
                .setLimits(0.01, 1.5, 0.01)
                .setValue(this.plugin.settings.graphSettings.zoomSpeed)
                .onChange((newValue ) =>{
                  this.plugin.settings.graphSettings.zoomSpeed = newValue;
                  this.plugin.settings.embedSettings.zoomSpeed = newValue;
                  this.plugin.saveData(this.plugin.settings);
                });
          });
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
      new Setting(containerEl)
          .setName('Open with shift')
          .setDesc('Only opens file when clicking on a node when shift is pressed')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.graphSettings.openWithShift)
                .onChange((new_value) => {
                  this.plugin.settings.graphSettings.openWithShift = new_value;
                  this.plugin.settings.embedSettings.openWithShift = new_value;
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
