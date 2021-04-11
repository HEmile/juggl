import type JugglPlugin from '../main';
import type {FileSystemAdapter} from 'obsidian';
import {promises as fs} from 'fs';
import type {Juggl} from './visualization';
import {MAX_FONT_SIZE, MAX_NODE_SIZE, MAX_TEXT_WIDTH, MIN_FONT_SIZE, MIN_NODE_SIZE, MIN_TEXT_WIDTH} from '../constants';

export const STYLESHEET_PATH = './.obsidian/juggl/style.css';
export const SHAPES = ['ellipse',
  'rectangle',
  'triangle',
  'diamond',
  'pentagon',
  'hexagon',
  'tag',
  'rhomboid',
  'star',
  'vee',
  'round-rectangle',
  'round-triangle',
  'round-diamond',
  'round-pentagon',
  'round-hexagon',
  'round-tag',

];
export type Shape = typeof SHAPES[number];
export class Icon {
    path: string;
    name: string;
    color: string = 'black';
}
export class StyleGroup {
  filter: string;
  color: string;
  shape: Shape;
  icon: Icon;
  showInPane: boolean;
  show: boolean;
  size: number;
}

export const DEFAULT_USER_SHEET = `
/* For a full overview of styling options, see https://js.cytoscape.org/#style */
`;

const YAML_MODIFY_SHEET = `


node[title] {
  label: data(title);
}

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
    plugin: JugglPlugin;
    constructor(plugin: JugglPlugin) {
      this.defaultSheet = this.getDefaultStylesheet();
      this.yamlModifySheet = YAML_MODIFY_SHEET;
      this.plugin = plugin;
    }

    async getStylesheet(viz: Juggl): Promise<string> {
      const file = (this.plugin.vault.adapter as FileSystemAdapter).getFullPath(STYLESHEET_PATH);
      // const customSheet = '';
      let customSheet = '';
      try {
        customSheet = await fs.readFile(file, 'utf-8')
            .catch(async (err) => {
              if (err.code === 'ENOENT') {
                const cstmSheet = DEFAULT_USER_SHEET;
                await fs.writeFile(file, cstmSheet);
                return cstmSheet;
              } else {
                throw err;
              }
            });
      } catch (e) {
        console.log('Couldn\'t load user stylesheet. This is probably because we are on mobile');
        console.log(e);
      }
      // TODO: Ordering: If people specify some new YAML property to take into account, style groups will override this!
      const globalGroups = this.styleGroupsToSheet(this.plugin.settings.globalStyleGroups, 'global');
      const localGroups = this.styleGroupsToSheet(viz.settings.styleGroups, 'local');
      return this.defaultSheet + globalGroups + customSheet + localGroups + this.yamlModifySheet;
    }


    colorToRGBA(col: string): string {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d');


      ctx.clearRect(0, 0, 1, 1);
      // In order to detect invalid values,
      // we can't rely on col being in the same format as what fillStyle is computed as,
      // but we can ask it to implicitly compute a normalized value twice and compare.
      ctx.fillStyle = '#000';
      ctx.fillStyle = col;
      const computed = ctx.fillStyle;
      ctx.fillStyle = '#fff';
      ctx.fillStyle = col;
      if (computed !== ctx.fillStyle) {
        return; // invalid color
      }
      ctx.fillRect(0, 0, 1, 1);
      const rgba = [...ctx.getImageData(0, 0, 1, 1).data];
      return `rgb(${rgba[0]}, ${rgba[1]}, ${rgba[2]})`;
    }

    getGraphColor(clazz: string): string {
      // Hacky way to get style properties set for Obsidians graph view
      const graphDiv = document.createElement('div');
      graphDiv.addClass('graph-view', clazz);
      document.body.appendChild(graphDiv);
      const computedColor = getComputedStyle(graphDiv).getPropertyValue('color');
      graphDiv.detach();
      return computedColor;
    }

    styleGroupsToSheet(groups: StyleGroup[], groupPrefix: string): string {
      let sheet = '';
      const parser = new DOMParser;
      for (const [index, val] of groups.entries()) {
        if (val.show) {
          let icon = '';
          if (val.icon && val.icon.path) {
            const svg = '<?xml version="1.0" encoding="UTF-8" ?>' +
                      '<!DOCTYPE svg>' +
                      '<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" version="1.1">' +
                      `<path fill="${val.icon.color}" d="${val.icon.path}" />` +
                      '</svg>';
            const html = parser.parseFromString(svg, 'text/xml').documentElement.outerHTML;
            icon = `background-image: url('data:image/svg+xml,${encodeURIComponent(html)}');`;
          }
          // Until size = 1, let text size linearly scale with node, then scale the square root.
          const textSizeModifier = Math.max(Math.min(val.size, 1), Math.sqrt(val.size));
          sheet += `
node.${groupPrefix}-${index} {
  background-color: ${val.color};
  shape: ${val.shape};
  background-fit: contain;
  ${icon} 
  width: mapData(degree, 0, 60, ${MIN_NODE_SIZE*val.size}, ${MAX_NODE_SIZE*val.size});
  height: mapData(degree, 0, 60, ${MIN_NODE_SIZE*val.size}, ${MAX_NODE_SIZE*val.size});
  font-size: mapData(degree, 0, 60, ${MIN_FONT_SIZE*textSizeModifier}, ${MAX_FONT_SIZE*textSizeModifier});
  text-max-width: mapData(degree, 0, 60, ${Math.round(MIN_TEXT_WIDTH*textSizeModifier)}px, ${Math.round(MAX_TEXT_WIDTH*textSizeModifier)}px);
}         
`;
        } else {
          sheet += `
node.${groupPrefix}-${index} {
  display: none;
}
`;
        }
      }
      return sheet;
    }

    getDefaultStylesheet(): string {
      const style = getComputedStyle(document.body);
      let font = style.getPropertyValue('--text');
      font = font.replace('BlinkMacSystemFont,', ''); // This crashes electron for some reason.
      const fillColor = this.getGraphColor('color-fill');
      const fillHighlightColor = this.getGraphColor('color-fill-highlight');
      const accentBorderColor = this.getGraphColor('color-circle');
      const lineColor = this.getGraphColor('color-line');
      const lineHighlightColor = this.getGraphColor('color-line-highlight');
      const textColor = this.getGraphColor('color-text');
      const danglingColor = this.getGraphColor('color-fill-unresolved');
      return `
node {
  background-color: ${fillColor};
  color: ${textColor};
  font-family: ${font};
  text-valign: bottom;
  shape: ellipse;
  border-width: 0;
  text-wrap: wrap;
  min-zoomed-font-size: 8;
}

node[name] {
  label: data(name);
}
node[degree] {
  width: mapData(degree, 0, 60, ${MIN_NODE_SIZE}, ${MAX_NODE_SIZE});
  height: mapData(degree, 0, 60, ${MIN_NODE_SIZE}, ${MAX_NODE_SIZE});
  font-size: mapData(degree, 0, 60, ${MIN_FONT_SIZE}, ${MAX_FONT_SIZE});
  text-opacity: mapData(degree, 0, 60, 0.7, 1);
  text-max-width: mapData(degree, 0, 60, ${MIN_TEXT_WIDTH}px, ${MAX_TEXT_WIDTH}px);
}

node:selected {
  background-blacken: 0.3;
  font-weight: bold;
  
}
node:selected[degree] {
  border-width: mapData(degree, 0, 60, 1, 3);
}

.dangling {
  background-color: ${danglingColor};
}

.image {
  shape: round-rectangle;
  width: 50;
  height: 50;
  background-opacity: 0;
  background-image: data(resource_url);
  background-image-crossorigin: anonymous;
  background-image-opacity: 1;
  background-fit: contain;
  font-size: 0;
  background-clip: node;
}

.image.note {
  font-size: mapData(degree, 0, 60, 5, 11);
}

edge {
  line-color: ${lineColor};
  loop-sweep: -50deg;
  loop-direction: -45deg;
  width: mapData(edgeCount, 1, 50, 0.55, 3);
  target-arrow-shape: vee;
  target-arrow-fill: filled;
  target-arrow-color: ${lineColor};
  arrow-scale: mapData(edgeCount, 1, 50, 0.35, 1.5);
  font-size: 6;
  font-family: ${font};
  color: ${textColor};
  curve-style: unbundled-bezier;
  control-point-distance: 23;
  control-point-weight: 0.6;
}

edge:selected {
  width: 0.7;
  font-weight: bold;
  line-color: ${lineHighlightColor};
}

:loop {
  display: none;
  width: mapData(edgeCount, 1, 30, 0.1, 1);
}

edge[type] {
  label: data(type);
}
.inactive-node,
.unhover {
    opacity: 0.3;
}
node.active-node,
node.hover {
    background-color: ${fillHighlightColor};
    font-weight: bold;
    border-width: 0.4;
    border-color: ${accentBorderColor};
    opacity: 1;
}
edge.hover,
edge.connected-active-node,
edge.connected-hover {
    width: 1;
    opacity: 1;
}
edge.hover,
edge.connected-hover {
    font-weight: bold;
    line-color: ${lineHighlightColor};  
    target-arrow-color: ${lineHighlightColor};
}

node.pinned {
    border-style: dotted;
    border-width: 2;
}
node.protected {
    ghost: yes;
    ghost-offset-x: 1px;
    ghost-offset-y: 1px;
    ghost-opacity: 0.5;
}
node.hard-filtered,
node.filtered {
    display: none;
}
`;
    }
}
