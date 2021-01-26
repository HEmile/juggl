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
  font-size: 6;
  curve-style: unbundled-bezier;
  control-point-distance: 23;
  control-point-weight: 0.6;
}

edge:selected {
  width: 0.7;
  font-weight: bold;
  line-color: #6A8695;
}

:loop {
  width: 0.1;
}

edge[type] {
  label: data(type);
}

node.active-file,
node.hover {
    font-weight: bold;
    border-width: 1;
    border-color: #1b6299;
}
edge.hover,
edge.connected-active-file,
edge.connected-hover {
    width: 1;
    line-color: #1b6299;  
    target-arrow-color: #1b6299;
}
edge.hover {
    font-weight: bold;
}
.inactive-file,
.unhover {
    opacity: 0.3;
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
      if (file && await this.plugin.vault.adapter.exists(file.path)) {
        customSheet = await this.plugin.vault.read(file);
      } else {
        customSheet = this.genStyleSheet();
        await this.plugin.vault.adapter.write('graph.css', customSheet);
      }

      return this.defaultSheet + customSheet + this.yamlModifySheet;
    }

    genStyleSheet(): string {
      const tagColorMap = {} as Record<string, string>;
      const folderShapeMap = {} as Record<string, string>;
      const shapes = ['round-triangle',
        'round-rectangle',
        'barrel',
        'rhomboid',
        'round-diamond',
        'round-pentagon',
        'round-hexagon',
        'round-heptagon',
        'round-octagon',
        'star',
        'vee'];
      const colorSet = [[
        '#0089BA',
        '#2C73D2',
        '#008E9B',
        '#0081CF',
        '#008F7A',
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
      let folderIter = 0;
      let tagsIter = 0;
      for (const file of this.plugin.vault.getMarkdownFiles()) {
        if (!(file.parent.name === '/' || file.parent.name === '')) {
          const folderClass = `folder-${file.parent.name
              .replace(' ', '_')}`;
          if (!(folderClass in folderShapeMap)) {
            folderShapeMap[folderClass] = shapes[folderIter];
            folderIter += 1;
          }
        }

        const cache = this.plugin.metadata.getFileCache(file);
        if (cache?.tags) {
          cache.tags.forEach((t) => {
            const tag = t.tag.slice(1);
            const hSplit = tag.split('/');
            const tags = [];
            for (const i in hSplit) {
              const hTag = hSplit.slice(0, parseInt(i) + 1).join('-');
              tags.push(`tag-${hTag}`);
            }
            for (const tag of tags) {
              if (!(tag in tagColorMap)) {
                tagColorMap[tag] = colors[tagsIter];
                tagsIter += 1;
              }
            }
          });
        }
      }

      let genSheet = '/* For a full overview of styling options, see https://js.cytoscape.org/#style */';
      console.log('here');
      for (const folder of Object.keys(folderShapeMap)) {
        genSheet += `
.${folder} {
    shape: ${folderShapeMap[folder]};
}
`;
      }

      for (const tag of Object.keys(tagColorMap)) {
        genSheet += `
.${tag} {
    background-color: ${tagColorMap[tag]};
}
`;
      }

      console.log('her!!');
      return genSheet;
    }
}
