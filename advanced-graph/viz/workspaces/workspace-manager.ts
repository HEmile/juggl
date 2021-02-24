import {Component, DataAdapter} from 'obsidian';
import type AdvancedGraphPlugin from '../../main';
import type {AdvancedGraph} from '../visualization';
import {DATA_FOLDER} from '../../constants';

export class WorkspaceManager extends Component {
    plugin: AdvancedGraphPlugin;
    adapter: DataAdapter;
    graphs: string[] = [];
    constructor(plugin: AdvancedGraphPlugin) {
      super();
      this.plugin = plugin;
      this.adapter = this.plugin.app.vault.adapter;
    }

    async onload() {
      super.onload();
      try {
        await this.adapter.mkdir(DATA_FOLDER);
        this.graphs = (await this.adapter.list(DATA_FOLDER)).folders;
      } catch (e) {
        console.log(e);
      }
    }

    async saveGraph(name: string, viz: AdvancedGraph) {
      try {
        await this.adapter.mkdir(DATA_FOLDER + name);
        const graphJson = viz.viz.json();
        await this.adapter.write(DATA_FOLDER + name + '/graph.json', JSON.stringify(graphJson));
        const settings = viz.settings;
        await this.adapter.write(DATA_FOLDER + name + '/settings.json', JSON.stringify(settings));
        if (!this.graphs.contains(name)) {
          this.graphs.push(name);
        }
      } catch (e) {
        console.log(e);
      }
    }

    async loadGraph(name: string, viz: AdvancedGraph) {

    }

    async deleteGraph(name: string, view: AdvancedGraph) {

    }
}
