import {
  CachedMetadata,
  Component,
  getLinkpath,
  iterateCacheRefs,
  LinkCache,
  MetadataCache, ReferenceCache,
  TFile,
  Vault,
} from 'obsidian';
import {IDataStore} from './interfaces';
import {DataStoreEvents} from './events';
import Neo4jViewPlugin from './main';
import {
  NodeDefinition,
  EdgeDefinition,
  ElementDataDefinition,
  NodeDataDefinition,
  NodeCollection,
  EdgeDataDefinition,
} from 'cytoscape';
import {VizId} from './visualization';
import {node} from 'cypher-query-builder';
import * as Url from 'url';

export const OBSIDIAN_STORE_NAME = 'Obsidian';

export class ObsidianStore extends Component implements IDataStore {
    plugin: Neo4jViewPlugin;
    events: DataStoreEvents;
    metadata: MetadataCache;
    vault: Vault
    constructor(plugin: Neo4jViewPlugin) {
      super();
      this.plugin = plugin;
      this.events = new DataStoreEvents();
      this.metadata = plugin.app.metadataCache;
      this.vault = plugin.app.vault;
    }

    getEvents(): DataStoreEvents {
      return this.events;
    }

    async connectNodes(allNodes: NodeCollection, newNodes: VizId[]): Promise<EdgeDefinition[]> {
      const edges: EdgeDefinition[] = [];
      const counter: Record<string, number> = {};
      for (const id of newNodes) {
        if (id.storeId === this.storeId()) {
          const file = this.getFile(id);
          if (file) {
            const cache = this.metadata.getFileCache(file);
            const srcId = id.toId();
            if (cache) {
              const content = (await this.vault.cachedRead(file)).split('\n');

              iterateCacheRefs(cache, (ref) => {
                const otherId = this.getOtherId(ref, file.path).toId();
                if (allNodes.$id(otherId).length > 0) {
                  const edgeId = `${srcId}->${otherId}`;
                  if (edgeId in counter) {
                    counter[edgeId] += +1;
                  } else {
                    counter[edgeId] = 1;
                  }

                  let data = {
                    id: `${edgeId}${counter[edgeId]}`,
                    source: srcId,
                    target: otherId,
                  } as EdgeDataDefinition;
                  let classes = '';

                  const line = content[ref.position.start.line];
                  data.context = line;
                  const typedLink = this.plugin.parseTypedLink(ref, line);
                  if (typedLink === null) {
                    classes = `${classes} inline`;
                  } else {
                    data = {...typedLink.properties, ...data};
                    classes = `${classes} ${typedLink.class}`;
                  }
                  edges.push({
                    group: 'edges',
                    data: data,
                    classes: classes,
                  });
                }
              });
            }
          }
        }
      }
      return edges;
    }

    getOtherId(link: ReferenceCache, sourcePath: string) : VizId {
      const path = getLinkpath(link.link);
      const file = this.metadata.getFirstLinkpathDest(path, sourcePath);
      let name: string;
      if (file) {
        name = file.extension === 'md' ? file.basename : file.name;
      } else {
        name = path;
      }
      return new VizId(name, this.storeId());
    }

    getNodeFromLink(link: ReferenceCache, sourcePath: string) : NodeDefinition {
      const path = getLinkpath(link.link);
      const file = this.metadata.getFirstLinkpathDest(path, sourcePath);
      if (file) {
        return this.nodeFromFile(file);
      } else {
        return this.nodeDangling(path);
      }
    }

    getFile(nodeId: VizId): TFile {
      return this.metadata.getFirstLinkpathDest(nodeId.id, '');
    }

    getBacklinks(nodeId: VizId): NodeDefinition[] {
      // Could be an expensive operation... No cached backlinks implementation is available in the Obsidian API though.
      if (nodeId.storeId === 'core') {
        const path = this.getFile(nodeId).path;
        // @ts-ignore
        const resolvedLinks = this.metadata.resolvedLinks;
        const nodes = [];
        for (const otherPath of Object.keys(resolvedLinks)) {
          if (path in resolvedLinks[otherPath]) {
            const file = this.vault.getAbstractFileByPath(otherPath) as TFile;
            nodes.push(this.nodeFromFile(file));
          }
        }
        return nodes;
      }
      return [];
    }

    nodeFromFile(file: TFile) : NodeDefinition {
      const cache = this.metadata.getFileCache(file);
      const name = file.extension === 'md' ? file.basename : file.name;
      const classes = this.plugin.getClasses(file).join(' ');

      const data = {
        id: VizId.toId(name, this.storeId()),
        name: name,
        resource_url: `http://localhost:${this.plugin.settings.imgServerPort}/${encodeURI(file.path)}`,
      } as NodeDataDefinition;
      const frontmatter = cache?.frontmatter;
      if (frontmatter) {
        Object.keys(frontmatter).forEach((k) => {
          if (!(k === 'position')) {
            if (k === 'image') {
              const imageField = frontmatter[k];
              try {
                // Check if url. throws error otherwise
                new URL(imageField);
                data[k] = imageField;
              } catch {
                data[k] = `http://localhost:${this.plugin.settings.imgServerPort}/${encodeURI(imageField)}`;
              }
            } else {
              data[k] = frontmatter[k];
            }
          }
        });
      }

      return {
        group: 'nodes',
        data: data,
        classes: classes,
      };
    }

    nodeDangling(path: string): NodeDefinition {
      return {
        group: 'nodes',
        data: {
          id: VizId.toId(path, this.storeId()),
          name: path,
        },
        classes: 'dangling',
      };
    }

    async getNeighbourhood(nodeIds: VizId[]): Promise<NodeDefinition[]> {
      const nodes: NodeDefinition[] = [];
      for (const nodeId of nodeIds) {
        if (nodeId.storeId === this.storeId()) {
          const file = this.getFile(nodeId);
          const cache = this.metadata.getFileCache(file);
          if (cache === null) {
            console.log('returning empty');
            return [];
          }
          nodes.push(this.nodeFromFile(file));
          iterateCacheRefs(cache, (ref) => {
            nodes.push(this.getNodeFromLink(ref, file.path));
          });
          nodes.push(...this.getBacklinks(nodeId));
        }
      }
      return nodes;
    }

    storeId(): string {
      return 'core';
    }

    get(nodeId: VizId): Promise<NodeDefinition> {
      const file = this.getFile(nodeId);
      const cache = this.metadata.getFileCache(file);
      if (cache === null) {
        console.log('returning empty');
        return null;
      }
      return Promise.resolve(this.nodeFromFile(file));
    }
}
