import {
  Component,
  getLinkpath,
  iterateCacheRefs,
  MetadataCache, ReferenceCache,
  TFile,
  Vault,
} from 'obsidian';
import type {IDataStore} from './interfaces';
import {DataStoreEvents} from './events';
import type AdvancedGraphPlugin from './main';
import type {
  NodeDefinition,
  EdgeDefinition,
  NodeDataDefinition,
  NodeCollection,
  EdgeDataDefinition, Collection,
} from 'cytoscape';
import type {AdvancedGraphView} from './viz/visualization';
import {CLASS_EXPANDED} from './constants';
import {VizId} from './interfaces';

export const OBSIDIAN_STORE_NAME = 'Obsidian';

export class ObsidianStore extends Component implements IDataStore {
    plugin: AdvancedGraphPlugin;
    events: DataStoreEvents;
    metadata: MetadataCache;
    vault: Vault
    constructor(plugin: AdvancedGraphPlugin) {
      super();
      this.plugin = plugin;
      this.events = new DataStoreEvents();
      this.metadata = plugin.app.metadataCache;
      this.vault = plugin.app.vault;
    }

    getEvents(): DataStoreEvents {
      return this.events;
    }

    async createEdges(srcFile: TFile, srcId: string, toNodes: NodeCollection): Promise<EdgeDefinition[]> {
      const cache = this.metadata.getFileCache(srcFile);
      if (!cache) {
        return [];
      }

      const edges: Record<string, EdgeDefinition[]> = {};
      const content = (await this.vault.cachedRead(srcFile)).split('\n');
      iterateCacheRefs(cache, (ref) => {
        const otherId = this.getOtherId(ref, srcFile.path).toId();
        if (toNodes.$id(otherId).length > 0) {
          const edgeId = `${srcId}->${otherId}`;
          const count = edgeId in edges ? edges[edgeId].length + 1 : 1;
          const line = content[ref.position.start.line];
          let data = {
            id: `${edgeId}${count}`,
            source: srcId,
            target: otherId,
            context: line,
            edgeCount: 1,
          } as EdgeDataDefinition;
          let classes = '';
          const typedLink = this.plugin.parseTypedLink(ref, line);
          if (typedLink === null) {
            classes = `${classes} inline`;
          } else {
            data = {...typedLink.properties, ...data};
            classes = `${classes} ${typedLink.class}`;
          }
          const edge = {
            group: 'edges',
            data: data,
            classes: classes,
          } as EdgeDefinition;
          if (edgeId in edges) {
            edges[edgeId].push(edge);
          } else {
            edges[edgeId] = [edge];
          }
        }
      });
      if (this.plugin.settings.mergeEdges) {
        // Merges inline edges.
        const returnEdges: EdgeDefinition[] = [];
        for (const edgeId of Object.keys(edges)) {
          const connectedEdges: EdgeDefinition[] = edges[edgeId];
          let inlineEdge: EdgeDefinition = null;
          let countInline = 0;
          for (const edge of connectedEdges) {
            if (edge.classes === ' inline') {
              if (inlineEdge) {
                inlineEdge.data.context += `
                
---

${edge.data.context}`;
                countInline += 1;
              } else {
                inlineEdge = edge;
                countInline = 1;
              }
            } else {
              returnEdges.push(edge);
            }
          }
          if (inlineEdge) {
            inlineEdge.data.edgeCount = countInline;
            returnEdges.push(inlineEdge);
          }
        }
        return returnEdges;//
      }
      // No merging, TODO
      return [].concat(...Object.values(edges));
    }

    async connectNodes(allNodes: NodeCollection, newNodes: NodeCollection): Promise<EdgeDefinition[]> {
      const edges: EdgeDefinition[] = [];
      // Find edges from newNodes to other nodes
      // @ts-ignore
      for (const node of newNodes) {
        const id = VizId.fromNode(node);
        if (id.storeId === this.storeId()) {
          const file = this.getFile(id);
          if (file) {
            const srcId = id.toId();

            edges.push(...await this.createEdges(file, srcId, allNodes));
          }
        }
      }
      // @ts-ignore
      for (const node of allNodes.difference(newNodes)) {
        // For all nodes other than the new nodes
        const id = VizId.fromNode(node);
        if (id.storeId === this.storeId()) {
          const file = this.getFile(id);
          if (file) {
            const srcId = id.toId();

            // Connect only to newNodes!
            edges.push(...await this.createEdges(file, srcId, newNodes));
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
      if (file === null) {
        console.log('null file', nodeId);
        return null;
      }
      const cache = this.metadata.getFileCache(file);
      if (cache === null) {
        console.log('returning empty cache', nodeId);
        return null;
      }
      return Promise.resolve(this.nodeFromFile(file));
    }

    async refreshNode(view: AdvancedGraphView, id: VizId) {
      const idS = id.toId();
      let correctEdges: Collection;
      let node = view.viz.$id(idS);
      if (node.length > 0 && node.hasClass(CLASS_EXPANDED)) {
        correctEdges = await view.expand(node);
      } else {
        const nodeDef = [await this.get(id)];
        view.mergeToGraph(nodeDef);
        node = view.viz.$id(idS);
        const edges = await view.buildEdges(node);
        correctEdges = view.mergeToGraph(edges);
      }
      // Remove outgoing edges that no longer exist.
      node.connectedEdges()
          .difference(correctEdges)
          .remove();
      view.restartLayout();
      // TODO: I don't think this one here was correct / should be needed.
      // view.updateActiveFile(node.nodes() as NodeSingular, true);
    }

    onload() {
      super.onload();
      const store = this;
      this.registerEvent(
          this.metadata.on('changed', (file) => {
            console.log('changed');
            store.plugin.activeViews().forEach(async (v) => {
              await store.refreshNode(v, VizId.fromFile(file));
            });
          }));
      this.registerEvent(
          this.vault.on('rename', (file, oldPath) => {
            if (file instanceof TFile) {
              const id = VizId.fromFile(file);
              const oldId = VizId.fromPath(oldPath);
              store.plugin.activeViews().forEach(async (v) => {
                setTimeout(async ()=> {
                  // Changing the ID of a node in Cytoscape is not allowed, so remove and then restore.
                  // Put in setTimeout because Obsidian doesn't immediately update the metadata on rename...
                  v.viz.$id(oldId.toId()).remove();
                  await store.refreshNode(v, id);
                }, 500);
              });
            }
          }));
      this.registerEvent(
          this.vault.on('delete', (file) => {
            if (file instanceof TFile) {
              store.plugin.activeViews().forEach((v) => {
                v.viz.$id(VizId.fromFile(file).toId()).remove();
              });
            }
          }));
    }
}
