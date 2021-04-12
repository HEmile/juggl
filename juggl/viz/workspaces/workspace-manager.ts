import {Component, DataAdapter} from 'obsidian';
import type JugglPlugin from '../../main';
import type {Juggl} from '../visualization';
import {DATA_FOLDER} from '../../constants';
import {VizId} from '../../interfaces';

export class WorkspaceManager extends Component {
    plugin: JugglPlugin;
    adapter: DataAdapter;
    graphs: string[] = [];
    constructor(plugin: JugglPlugin) {
      super();
      this.plugin = plugin;
      this.adapter = this.plugin.app.vault.adapter;
    }

    async onload() {
      super.onload();
      try {
        await this.adapter.mkdir(DATA_FOLDER(this.plugin.vault));
        const path = require('path');
        this.graphs = (await this.adapter.list(DATA_FOLDER(this.plugin.vault))).folders.map((s) => path.basename(s));
      } catch (e) {
        console.log(e);
      }
    }

    async saveGraph(name: string, viz: Juggl) {
      try {
        const folder = DATA_FOLDER(viz.vault) + name;
        await this.adapter.mkdir(folder);
        const graphJson = viz.viz.json();
        await this.adapter.write(folder + '/graph.json', JSON.stringify(graphJson));
        const settings = viz.settings;
        await this.adapter.write(folder + '/settings.json', JSON.stringify(settings));
        if (!this.graphs.contains(name)) {
          this.graphs.push(name);
        }
      } catch (e) {
        console.log(e);
      }
    }

    async loadGraph(name: string, viz: Juggl) {
      try {
        const folder = DATA_FOLDER(viz.vault) + name;
        const graph = JSON.parse(await this.adapter.read(folder + '/graph.json'));
        const settings = JSON.parse(await this.adapter.read( folder + '/settings.json'));
        viz.viz.json(graph);
        viz.settings = settings;

        // After loading in the graph, we have to validate with the datastores that the data is still up-to-date:
        // This could create race-condition conflicts possibly when a node updates in the meantime.
        const nodes = viz.viz.nodes();
        for (let i=1; i < nodes.length; i++ ) {
          if (!nodes[i]) {
            continue;
          }
          const vId = VizId.fromNode(nodes[i]);

          for (const store of viz.datastores.dataStores) {
            if (store.storeId() === vId.storeId) {
              await store.refreshNode(viz, vId);
              break;
            }
          }
        }
      } catch (e) {
        console.log(e);
      }
    };

    async deleteGraph(name: string, view: Juggl) {
      try {
        await this.adapter.rmdir(DATA_FOLDER + name, true);
        this.graphs.remove(name);
      } catch (e) {
        console.log(e);
      }
    }
}
