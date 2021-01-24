import {Events, TFile} from 'obsidian';
import AdvancedGraphPlugin from './main';
import {AdvancedGraphView} from './visualization';

const DEFAULT_SHEET =`
node {
  background-color: #828282;
  label: data(name);
  text-valign: bottom;
  shape: ellipse;
  width: mapData(degree, 0, 60, 5, 35);
  height: mapData(degree, 0, 60, 5, 35);
  font-size: mapData(degree, 0, 60, 5, 11);
  text-opacity: mapData(degree, 0, 60, 0.7, 1);
  border-width: 0;
  text-wrap: wrap;
  text-max-width: mapData(degree, 0, 60, 65px, 100px);
}

node:selected {
  background-blacken: 0.3;
  border-width: mapData(degree, 0, 60, 1, 3);
  font-weight: bold;
  
}

.dangling {
  background-color: #CFCFCF;
}

.image {
  shape: round-rectangle;
  width: 50;
  height: 50;
  background-opacity: 0;
  background-image: data(resource_url);
  background-image-opacity: 1;
  background-fit: contain;
  font-size: 0;
  background-clip: node;
}

edge {
  line-color: #E6E6E6;
  loop-sweep: -50deg;
  loop-direction: -45deg;
  width: 0.5;
  target-arrow-shape: vee;
  target-arrow-fill: filled;
  target-arrow-color: #E6E6E6;
  arrow-scale: 0.5;
  curve-style: bezier;
  font-size: 6;
}

edge:selected {
  width: 0.7;
  font-weight: bold;
  line-color: #6A8695;
}

.loop {
  width: 0.1;
}

edge[type] {
  label: data(type);
}
`;

const YAML_MODIFY_SHEET = `
node[color] {
  background-color: data(color);
}

node[shape] {
  shape: data(shape);
}

node[width] {
  width: data(width);
}

node[height] {
  width: data(height);
}

node[image] {
  background-image: data(image);
}
`;
/*
defaultSheet comes before graph.css, yamlModifySheet comes after.
 */
export class GraphStyleSheet {
    defaultSheet: string;
    yamlModifySheet: string;
    view: AdvancedGraphView;
    plugin: AdvancedGraphPlugin;
    constructor(view: AdvancedGraphView) {
      this.defaultSheet = DEFAULT_SHEET;
      this.yamlModifySheet = YAML_MODIFY_SHEET;
      this.plugin = view.plugin;
      this.view = view;
    }

    async getStylesheet(): Promise<string> {
      const file = this.plugin.vault.getAbstractFileByPath('graph.css') as TFile;
      let customSheet = '';
      if (await this.plugin.vault.adapter.exists(file.path)) {
        customSheet = await this.plugin.vault.read(file);
      } else {
        customSheet = '';
      }

      return this.defaultSheet + customSheet + this.yamlModifySheet;
    }
}
