import Neo4jViewPlugin from './main';
import {
  Component,
  MetadataCache, Notice,
  Vault,
  Workspace,
} from 'obsidian';
import {IAdvancedGraphSettings} from './settings';
import {IDataStore} from './interfaces';
import {
  TAbstractFile, TFile,
} from 'obsidian';
import {Query, node, relation, NodePattern} from 'cypher-query-builder';
import {SyncQueue} from './sync';
import {basename} from 'path';
import {DataStoreEvents} from './events';
import {CAT_DANGLING, Neo4jInterface} from './neo4j';
import {NodeDefinition, EdgeDefinition, NodeCollection} from 'cytoscape';
import {VizId} from './visualization';


export class QueryMetadata {
  nodeIndex: number=0;
  nodeVars: Record<string, string>={};

  nextNodeVar(name: string, prefix:string='n'): string {
    const varName = `${prefix}${this.nodeIndex.toString()}`;
    this.nodeVars[name] = varName;
    this.nodeIndex += 1;
    return varName;
  }

  values() {
    return Object.keys(this.nodeVars).map((k) => this.nodeVars[k]);
  }
}


export class Neo4jStream extends Component implements IDataStore {
    plugin: Neo4jViewPlugin;
    workspace: Workspace;
    settings: IAdvancedGraphSettings;
    vault: Vault;
    metadataCache: MetadataCache;
    lastFileEvent: string;
    neo4j: Neo4jInterface;
    events: DataStoreEvents;
    tags: string[];
    eventQueue: SyncQueue;

    constructor(plugin: Neo4jViewPlugin) {
      super();
      this.plugin = plugin;
      this.workspace = plugin.app.workspace;
      this.vault = plugin.app.vault;
      this.settings = plugin.settings;
      this.metadataCache = plugin.app.metadataCache;
      this.eventQueue = new SyncQueue(this);
      this.events = new DataStoreEvents();
      this.neo4j = new Neo4jInterface(plugin);
    }

    getEvents(): DataStoreEvents {
      return this.events;
    }

    public async onload() {
      super.onload();
      if (this.plugin.app.workspace.layoutReady) {
        await this.initialize();
      } else {
        this.plugin.app.workspace.on('layout-ready', () => {
          this.initialize();
        });
      }
    }

    public async restart() {
      await this.shutdown();
      await this.initialize();
    }

    public async shutdown() {
      await this.neo4j.shutdown();
    }

    public async onunload() {
      super.onunload();
      await this.shutdown();
    }

    public async initialize() {
      console.log('Initializing Neo4j stream');
      new Notice('Initializing Neo4j stream.');
      this.plugin.statusBar.setText('Initializing Neo4j stream');
      await this.neo4j.start();
      try {
        const connection = this.neo4j.session();
        if (this.settings.debug) {
          console.log('Removing existing data');
        }

        // await this.connection.run("MATCH (n) RETURN n LIMIT 10").then(res => {
        //     console.log(res);
        // });

        await this.neo4j.executeQueries([new Query()
            .matchNode('n', {SMD_vault: this.vault.getName()})
            .detachDelete('n')]);
        console.log('Iterating md files');
        // let noteQueries: Query[] = [];
        const markdownFiles = this.vault.getMarkdownFiles();
        let query = new Query();
        const queryMetadata = new QueryMetadata();

        for (const file of markdownFiles) {
          queryMetadata.nextNodeVar(file.basename);
          query = await this.neo4j.queryCreateNote(file, query, queryMetadata);
        }

        // console.log("Pushing notes");
        // await this.runQueries([query]);

        for (const file of markdownFiles) {
          await this.neo4j.queryCreateRels(file, query, queryMetadata);
        }

        console.log('Pushing to Neo4j');
        await this.neo4j.executeQueries([query], connection);

        // TODO: Define schema/indexes

        this.registerEvent(
            this.metadataCache.on('changed', (file) =>
              this.eventQueue.execute(this.metadataCacheOnChanged, file)));
        this.registerEvent(
            this.vault.on('rename', (file, oldPath) =>
              this.eventQueue.execute(this.vaultOnRename, file, oldPath)));
        this.registerEvent(
            this.vault.on('modify', (file) =>
              this.eventQueue.execute(this.vaultOnModify, file)));
        this.registerEvent(
            this.vault.on('delete', (file) =>
              this.eventQueue.execute(this.vaultOnDelete, file)));
        this.registerEvent(
            this.vault.on('create', (file) =>
              this.eventQueue.execute(this.vaultOnCreate, file)));

        new Notice('Neo4j stream online!');
        this.plugin.statusBar.setText('Neo4j stream online');

        await connection.close();
      } catch (e) {
        console.log(e);
        new Notice('Error during initialization of the Neo4j stream. Check the console for crash report.');
        this.plugin.statusBar.setText('Neo4j stream offline');
      }
    }


    async metadataCacheOnChanged(file: TAbstractFile) {
      // It's always called after the respective other events.
      // Note: This is NOT called on rename, unless there's a reflexive link to itself.
      // When a file is created, this is fired with an empty filecache. We synchronize the event firing,
      // so we let the create callback handle the creation of the node.

      console.log('changed metadata');
      console.log(file);
      const session = this.neo4j.session();
      if (file instanceof TFile) {
        const name = file.basename;
        const queryMetadata = new QueryMetadata();
        const nodeVar = 'n0';
        // Find all labels on node
        const result = await this.neo4j.runQuery(
            new Query().match(this.neo4j.node(nodeVar, name)).return(nodeVar), session);
        console.log(result);
        const oldLabels = result.records[0].get(0).labels;

        if (oldLabels.length > 0) {
          console.log(oldLabels);
          // Remove all labels on node
          await this.neo4j.runQuery(new Query().match(this.neo4j.node(nodeVar, name))
              // @ts-ignore
              .removeLabels({n0: oldLabels}), session);
        }

        queryMetadata.nodeIndex = 1;
        queryMetadata.nodeVars[name] = nodeVar;
        console.log(this.metadataCache.getFileCache(file as TFile));
        let query = new Query().match(this.neo4j.node(nodeVar, name));
        // Update node with new info
        query = await this.neo4j.queryUpdateNote(file, query, queryMetadata);
        await this.neo4j.executeQueries([query], session);
        // Delete all outgoing edges:
        const dRelQuery = new Query().match([
          this.neo4j.node(nodeVar, name),
          relation('out', 'r'), node('plc')])
            .delete('r');
        await this.neo4j.executeQueries([dRelQuery]);
        // Recreate relations, taking into account any changes
        const relQuery = await this.neo4j.queryCreateRels(file, new Query().match(this.neo4j.node(nodeVar, name)), queryMetadata, true);
        await this.neo4j.executeQueries([relQuery.return(nodeVar)], session);
        this.events.trigger('modifyNode', name);
      }
      await session.close();
    }

    async vaultOnRename(file: TAbstractFile, oldPath: string) {
      // This is called BEFORE metadataCache vault change.
      // So if we just rename the neo4j node, it should be fine when rebuilding relations. But rebuilding relations
      // should happen before the rename event is resolved... Hopefully it works async
      console.log('onRename');

      if (file instanceof TFile) {
        const oldName = basename(oldPath, '.md');
        console.log(oldName);
        const query = new Query().match(this.neo4j.node('n', oldName))
            .setValues({n: {name: file.basename}}, true);
        await this.neo4j.executeQueries([query]);
        this.events.trigger('renameNode', oldName, file.basename);
      }
      this.lastFileEvent = 'rename';
    }

    async vaultOnModify(file: TAbstractFile) {
      // Called BEFORE metadataCache changed event.
      // At this point, the metadataCache HASN'T been updated yet!
      // It shouldn't be needed to do anything related with relation/tag updating here.
      // At most, we could update the content property of the node.
      this.lastFileEvent = 'modify';
      console.log('onModify');
    }

    async vaultOnDelete(file: TAbstractFile) {
      // After deleting, no metadatacache changed event is fired.
      // Note: MetadataCache event isn't called either for incoming edges
      this.lastFileEvent = 'delete';
      console.log('onDelete');

      const session = this.neo4j.session();

      if (file instanceof TFile) {
        const name = file.basename;
        const result = await this.neo4j.runQuery(new Query().match([
          this.neo4j.node('n', name),
          relation('in'),
          node('m')]).return('n'), session,
        );
        console.log(result);
        if (result.records.length === 0) {
          // If there are no incoming links, detach delete the node
          await this.neo4j.executeQueries([
            new Query().match(this.neo4j.node('n', name))
                .detachDelete('n')], session);
          this.events.trigger('deleteNode', name);
        } else {
          // If there are any incoming links, change labels to dangling and empty properties
          const result = await this.neo4j.runQuery(new Query()
              .match(this.neo4j.node('n', name)).return('n'), session);
          // return query.setValues({}).removeLabels(dict);
          let query = new Query().match(this.neo4j.node('n', name));
          const oldLabels = result.records[0].get(0).labels;
          if (oldLabels.length > 0) {
            query = query.removeLabels({n: oldLabels});
          }
          query = query.setLabels({n: CAT_DANGLING})
              .setValues({
                SMD_community: this.tags.indexOf(CAT_DANGLING),
                SMD_vault: this.vault.getName(),
                name: name,
              }, false);
          await this.neo4j.executeQueries([query], session);
          this.events.trigger('modifyNode', name);
        }
      }
      await session.close();
    }

    async vaultOnCreate(file: TAbstractFile) {
      // This is called BEFORE metadataCache vault change.
      // Create the node as a blank state, then fill in later with on metadatacache changed etc.
      // Note: it's possible the node already exists as a dangling node. In that case, just do nothing
      // and let the metadatacache event handle it
      this.lastFileEvent = 'create';
      console.log('onCreate');
      const session = this.neo4j.session();
      console.log('sess created');
      if (file instanceof TFile) {
        const name = file.basename;
        const result = await this.neo4j.runQuery(new Query().match(this.neo4j.node('n', name))
            .return('n'), session);
        console.log(result);
        if (result.records.length == 0) {
          // if not exists:
          await this.neo4j.executeQueries([new Query().create(this.neo4j.node('n', name))], session);
          this.events.trigger('createNode', name);
        }
      }
    }

    async connectNodes(allNodes: NodeCollection, newNodes: VizId[]): Promise<EdgeDefinition[]> {
      return [];
    }

    async getNeighbourhood(nodeId: VizId): Promise<NodeDefinition[]> {
      return [];
    }

    storeId(): string {
      return 'core';
    }

    get(nodeId: VizId): Promise<cytoscape.NodeDefinition> {
      return Promise.resolve(undefined);
    }
}
