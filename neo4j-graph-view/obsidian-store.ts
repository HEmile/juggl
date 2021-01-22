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
import {NodeDefinition, EdgeDefinition, ElementDataDefinition, NodeDataDefinition, NodeCollection} from 'cytoscape';
import {VizId} from './visualization';
import {node} from 'cypher-query-builder';

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

    connectNodes(allNodes: NodeCollection, newNodes: VizId[]): EdgeDefinition[] {
      const edges: EdgeDefinition[] = [];
      const counter: Record<string, number> = {};
      for (const id of newNodes) {
        console.log(id);
        if (id.storeId === this.storeId()) {
          const file = this.getFile(id);
          if (file) {
            const cache = this.metadata.getFileCache(file);
            const srcId = id.toId();
            if (cache) {
              iterateCacheRefs(cache, (ref) => {
                const otherId = this.getOtherId(ref, file.path).toId();
                console.log(allNodes.$id(otherId));
                if (allNodes.$id(otherId).length > 0) {
                  const edgeId = `${srcId}->${otherId}`;
                  if (edgeId in counter) {
                    counter[edgeId] += +1;
                  } else {
                    counter[edgeId] = 1;
                  }

                  edges.push({
                    group: 'edges',
                    data: {
                      id: `${edgeId}${counter[edgeId]}`,
                      source: srcId,
                      target: otherId,
                    },
                    classes: srcId === otherId ? 'loop' : '',
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
      console.log('getting backlinks');
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
      console.log(cache);
      const classes = this.plugin.getDanglingClasses(file)
          .concat(cache?.tags ? cache.tags.map((t) => `tag-${t.tag.slice(1)}`): [])
          .map((s) => s.replace(' ', '_'))
          .join(' ');

      const data = {
        id: VizId.toId(name, this.storeId()),
        name: name,
      } as NodeDataDefinition;
      const frontmatter = cache?.frontmatter;
      if (frontmatter) {
        Object.keys(frontmatter).forEach((k) => {
          if (!(k === 'position')) {
            data[k] = frontmatter[k];
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

    getNeighbourhood(nodeId: VizId): NodeDefinition[] {
      const file = this.getFile(nodeId);
      const cache = this.metadata.getFileCache(file);
      if (cache === null) {
        console.log('returning empty');
        return [];
      }
      const nodes = [this.nodeFromFile(file)];
      iterateCacheRefs(cache, (ref) => {
        nodes.push(this.getNodeFromLink(ref, file.path));
      });
      return nodes.concat(this.getBacklinks(nodeId));
    }

    storeId(): string {
      return 'core';
    }
}
