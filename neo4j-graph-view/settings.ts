import {App, Notice, PluginSettingTab, Setting, SplitDirection} from 'obsidian';

import Neo4jViewPlugin from './main';
// import {EdgeOptions, NodeOptions} from 'vis-network';
import {AdvancedGraphView, AG_VIEW_TYPE} from './visualization';

export interface IAdvancedGraphSettings {
    indexContent: boolean;
    autoExpand: boolean;
    autoAddNodes: boolean;
    community: string;
    hierarchical: boolean;
    convertMarkdown: boolean;
    showArrows: boolean;
    inlineContext: boolean;
    password: string;
    typedLinkPrefix: string;
    splitDirection: SplitDirection; // 'horizontal';
    imgServerPort: number;
    debug: boolean;
    nodeSettings: string;
    edgeSettings: string;
}

export const DefaultNodeSettings = {
  size: 9,
  font: {
    size: 12,
    strokeWidth: 1,
  },
  borderWidth: 0,
  widthConstraint: {maximum: 200},
};

export const DefaultEdgeSettings = {
  font: {
    size: 12,
    strokeWidth: 2,
  },
  width: 0.5,
};

export const DefaultNeo4jViewSettings: IAdvancedGraphSettings = {
  autoAddNodes: true,
  autoExpand: false,
  hierarchical: false,
  indexContent: false,
  convertMarkdown: true,
  community: 'tags',
  password: '',
  showArrows: true,
  inlineContext: false,
  splitDirection: 'vertical',
  typedLinkPrefix: '-',
  imgServerPort: 3837,
  debug: false,
  nodeSettings: JSON.stringify({
    'defaultStyle': DefaultNodeSettings,
    'exampleTag': {
      size: 20,
      color: 'yellow',
    },
    'image': {
      size: 40,
      font: {
        size: 0,
      },
    },
  }),
  edgeSettings: JSON.stringify({
    'defaultStyle': DefaultEdgeSettings,
  }),
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
      containerEl.createEl('h3', {text: 'Appearance'});

      new Setting(containerEl)
          .setName('Color-coding')
          .setDesc('What property to choose for coloring the nodes in the graph. Requires a server restart.')
          .addDropdown((dropdown) => dropdown
              .addOption('tags', 'Tags')
              .addOption('folders', 'Folders')
              .addOption('none', 'No color-coding')
              .setValue(this.plugin.settings.community)
              .onChange((value) => {
                this.plugin.settings.community = value;
                this.plugin.saveData(this.plugin.settings);
              }));


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

      new Setting(containerEl)
          .setName('Show arrows')
          .setDesc('Show arrows on edges.')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.showArrows)
                .onChange((newValue) => {
                  this.plugin.settings.showArrows = newValue;
                  this.plugin.saveData(this.plugin.settings);
                });
          });
      new Setting(containerEl)
          .setName('Show context on inline links')
          .setDesc('Shows the paragraph where an inline link is in on the edge.')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.inlineContext)
                .onChange((newValue) => {
                  this.plugin.settings.inlineContext = newValue;
                  this.plugin.saveData(this.plugin.settings);
                });
          });
      containerEl.createEl('h4');
      containerEl.createEl('h4', {text: 'Node Styling'});

      const div = document.createElement('div');
      div.className = 'neovis_setting';
      this.containerEl.children[this.containerEl.children.length - 1].appendChild(div);
      div.setAttr('style', 'height: 100%; width:100%');

      const input = div.createEl('textarea');
      input.placeholder = JSON.stringify(DefaultNodeSettings);
      input.value = this.plugin.settings.nodeSettings;
      input.onchange = (ev) => {
        this.plugin.settings.nodeSettings = input.value;
        this.plugin.saveData(this.plugin.settings);
        const leaves = this.plugin.app.workspace.getLeavesOfType(AG_VIEW_TYPE);
        leaves.forEach((leaf) =>{
          (leaf.view as AdvancedGraphView).updateStyle();
        });
      };
      input.setAttr('style', 'height: 300px; width: 100%; ' +
            '-webkit-box-sizing: border-box; -moz-box-sizing: border-box;  box-sizing: border-box;');

      const temp_link = document.createElement('a');
      temp_link.href = 'https://publish.obsidian.md/semantic-obsidian/Node+styling';
      temp_link.target = '_blank';
      temp_link.innerHTML ='this link';

      const par = document.createElement('p');
      par.innerHTML = 'Styling of nodes in .json format. <br>' +
            'Use {"defaultStyle": {}} for the default styling of nodes. ' +
            'Use {"image": {}} to style images. Use {"SMD_dangling": {}} to style dangling notes. <br>' +
            'When color-coding is set to Folders, use the path to the folder for this key. ' +
            'Use {"/" for the root folder. <br>' +
            'See ' + temp_link.outerHTML + ' for help with styling nodes. ';

      containerEl.appendChild(par);

      containerEl.createEl('h4');
      containerEl.createEl('h4', {text: 'Edge Styling'});

      const div2 = document.createElement('div');
      div2.className = 'neovis_setting2';
      this.containerEl.children[this.containerEl.children.length - 1].appendChild(div2);
      div2.setAttr('style', 'height: 100%; width:100%');

      const input2 = div2.createEl('textarea');
      input2.placeholder = JSON.stringify(DefaultEdgeSettings);
      input2.value = this.plugin.settings.edgeSettings;
      input2.onchange = (ev) => {
        this.plugin.settings.edgeSettings = input2.value;
        this.plugin.saveData(this.plugin.settings);
        const leaves = this.plugin.app.workspace.getLeavesOfType(AG_VIEW_TYPE);
        leaves.forEach((leaf) =>{
          (leaf.view as AdvancedGraphView).updateStyle();
        });
      };
      input2.setAttr('style', 'height: 300px; width: 100%; ' +
            '-webkit-box-sizing: border-box; -moz-box-sizing: border-box;  box-sizing: border-box;');

      const temp_link2 = document.createElement('a');
      temp_link2.href = 'https://publish.obsidian.md/semantic-obsidian/Edge+styling';
      temp_link2.target = '_blank';
      temp_link2.innerHTML = 'this link';

      const par2 = document.createElement('p');
      par2.innerHTML = 'Styling of edges is done in .json format. <br>' +
            'The first key determines what types of links to apply this style to. ' +
            'Use {"defaultStyle": {}} for the default styling of edges, and {"inline":{} } for the styling of untyped links. ' +
            'See ' + temp_link2.outerHTML + ' for help with styling edges.';

      containerEl.appendChild(par2);


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
          .setName('Convert Markdown')
          .setDesc('If true, the server will convert the content of notes to HTML. This can slow the server. ' +
                'Turn it off to increase server performance at the cost of not having proper previews on hovering in the graph. ')
          .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.convertMarkdown)
                .onChange((new_value) => {
                  this.plugin.settings.convertMarkdown = new_value;
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
