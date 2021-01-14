import Neo4jViewPlugin from './main';
import {
  EventRef, Events,
  getLinkpath, LinkCache, Menu,
  MetadataCache, Notice, Tasks,
  Vault,
  Workspace, WorkspaceLeaf,
} from 'obsidian';
import {INeo4jViewSettings} from './settings';
import {
  TAbstractFile, TFile,
} from 'obsidian';
import {Query, node, relation, NodePattern} from 'cypher-query-builder';
import {Driver, Result, ResultSummary, Session} from 'neo4j-driver';
import {SyncQueue} from './sync';
import neo4j from 'neo4j-driver';
import {basename} from 'path';

export const CAT_DANGLING = 'SMD_dangling';
export const CAT_NO_TAGS = 'SMD_no_tags';
export const nameRegex = '[^\\W\\d]\\w*';
export const initialTags = ['image', 'audio', 'video', 'pdf', 'file', CAT_NO_TAGS, CAT_DANGLING];
// Match around [[ and ]], and ensure content isn't a wikilnk closure
// This doesn't explicitly parse aliases.
export const wikilinkRegex = '\\[\\[([^\\]\\r\\n]+?)\\]\\]';


export class Neo4jStream extends Events {
    plugin: Neo4jViewPlugin;
    workspace: Workspace;
    settings: INeo4jViewSettings;
    vault: Vault;
    metadataCache: MetadataCache;
    driver: Driver;
    lastFileEvent: string;
    events: EventRef[];
    tags: string[];
    eventQueue: SyncQueue;

    constructor(plugin: Neo4jViewPlugin) {
      super();
      this.plugin = plugin;
      this.workspace = plugin.app.workspace;
      this.vault = plugin.app.vault;
      this.settings = plugin.settings;
      this.metadataCache = plugin.app.metadataCache;
      this.tags = [...initialTags];
      this.eventQueue = new SyncQueue(this);
    }

    queryMetadata() {
      return {
        nodeIndex: 0,
        relIndex: 0,
        nodeVars: {},
        relVars: {},
        tags: this.tags,
      } as QueryMetadata;
    };

    public async start() {
      if (this.driver) {
        await this.driver.close();
      }

      this.driver = neo4j.driver('neo4j://localhost',
          neo4j.auth.basic('neo4j', this.settings.password), {
            maxTransactionRetryTime: 30000,
          });
      const connection = this.session();
      if (this.settings.debug) {
        console.log('Removing existing data');
      }

      // await this.connection.run("MATCH (n) RETURN n LIMIT 10").then(res => {
      //     console.log(res);
      // });

      await this.executeQueries([new Query()
          .matchNode('n', {SMD_vault: this.vault.getName()})
          .detachDelete('n')]);
      console.log('Iterating md files');
      // let noteQueries: Query[] = [];
      const markdownFiles = this.vault.getMarkdownFiles();
      let query = new Query();
      const queryMetadata = this.queryMetadata();

      for (const [i, file] of markdownFiles.entries()) {
        queryMetadata.nodeVars[file.basename] = 'n' + i.toString();
        queryMetadata.nodeIndex = i;
        query = await this.queryCreateNote(file, query, queryMetadata);
      }

      // console.log("Pushing notes");
      // await this.runQueries([query]);

      for (const file of markdownFiles) {
        await this.queryCreateRels(file, query, queryMetadata);
      }

      console.log('Pushing to Neo4j');
      await this.executeQueries([query], connection);

      // TODO: Define schema/indexes

      this.events = [];
      this.events.push(
          this.metadataCache.on('changed', (file) =>
            this.eventQueue.execute(this.metadataCacheOnChanged, file)));
      this.events.push(
          this.vault.on('rename', (file, oldPath) =>
            this.eventQueue.execute(this.vaultOnRename, file, oldPath)));
      this.events.push(
          this.vault.on('modify', (file) =>
            this.eventQueue.execute(this.vaultOnModify, file)));
      this.events.push(
          this.vault.on('delete', (file) =>
            this.eventQueue.execute(this.vaultOnDelete, file)));
      this.events.push(
          this.vault.on('create', (file) =>
            this.eventQueue.execute(this.vaultOnCreate, file)));

      new Notice('Neo4j stream online!');
      this.plugin.statusBar.setText('Neo4j stream online');

      await connection.close();
    }

    public session(): Session {
      return this.driver.session();
    }

    public runQuery(query: Query, session: Session|null=null): Result {
      let newSess = false;
      if (session === null) {
        newSess = true;
        session = this.driver.session();
      }
      const queryO = query.buildQueryObject();
      if (this.settings.debug) {
        console.log(queryO);
      }

      const q = session.run(queryO.query, queryO.params);
      if (newSess) {
        q.subscribe({
          async onCompleted(summary: ResultSummary) {
            await session.close();
          },
        });
      }
      return q;
    }

    public async executeQueries(queries: Query[], session: Session|null=null) {
      for (const i in queries) {
        console.log(this);
        // Note: The await here is important, as a connection cannot run multiple transactions simultaneously.
        await this.runQuery(queries[i], session).then((value) => {
          if (this.settings.debug) {
            console.log(value);
          }
        }).catch((reason) => {
          console.log('Query failed');
          console.log(queries[i].buildQueryObject());
          console.log(reason);
        });
      }
      // let promise = this.connection.writeTransaction(async transaction => {
      //     queries.forEach(query => {
      //         if (this.settings.debug) {
      //             console.log(query);
      //         }
      //         let queryO = query.buildQueryObject();
      //         transaction.run(queryO.query, queryO.params);
      //     });
      // })
    }

    public node(varName: string, name: string): NodePattern {
      return node(varName, {name: name, SMD_vault: this.vault.getName()});
    }

    public async queryUpdateNote(file: TFile, query: Query, queryMetadata: QueryMetadata): Promise<Query> {
      return this.queryCreateOrUpdateNote(file, query, queryMetadata, true);
    }

    public async queryCreateNote(file: TFile, query: Query, queryMetadata: QueryMetadata): Promise<Query> {
      return this.queryCreateOrUpdateNote(file, query, queryMetadata, false);
    }

    async queryCreateOrUpdateNote(file: TFile, query: Query, queryMetadata: QueryMetadata, update:boolean): Promise<Query> {
      const metadata = this.metadataCache.getFileCache(file);
      const tags = queryMetadata.tags;
      if (metadata) {
        const frontmatter = metadata.frontmatter;
        const communityTag = metadata.tags ? metadata.tags[0].tag.slice(1) : CAT_NO_TAGS;
        if (!(tags.includes(communityTag))) {
          tags.push(communityTag);
        }
        const properties = {
          // TODO: Probably best to deprecate communities at some point
          SMD_community: communityTag ? tags.indexOf(communityTag): 0,
          SMD_path: file.path,
          SMD_vault: this.vault.getName(),
          name: file.basename,
          content: await this.vault.cachedRead(file),
        } as INoteProperties;
        if (frontmatter) {
          Object.keys(frontmatter).forEach((k) => {
            if (!(k=== 'position')) {
              properties[k] = frontmatter[k];
            }
          });
        }
        const labels = (metadata.tags ? metadata.tags.map((tag) => {
          // Escape the hastag
          return tag.tag.slice(1);
        }) : [CAT_NO_TAGS]).concat(
            file.parent.path === '/' ? [] : [file.parent.name],
        );
        const nodeVar = queryMetadata.nodeVars[file.basename];
        if (update) {
          return query.set({
            labels: {
              [nodeVar]: labels,
            },
            values: {
              [nodeVar]: properties,
            },
          }, {
            merge: false,
          });
        } else {
          return query.createNode(nodeVar,
              labels,
              properties,
          );
        }
      }
      console.log('File without metadata');
      console.log(file);
      return null;
    }

    public getDanglingTags(basename: string, file: TFile): string[] {
      if (file) {
        const tags = [];
        if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'tiff'].includes(file.extension)) {
          tags.push('image');
        } else if (['mp3', 'webm', 'wav', 'm4a', 'ogg', '3gp', 'flac'].includes(file.extension)) {
          tags.push('audio');
        } else if (['mp4', 'webm', 'ogv'].includes(file.extension)) {
          tags.push('video');
        } else if (file.extension === 'pdf') {
          tags.push('PDF');
        }
        if (!(file.parent.name === '/')) {
          tags.push(file.parent.name);
        }
        tags.push('file');
        return tags;
      }
      return [CAT_DANGLING];
    }

    regexEscape(str: string) {
      return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    public parseTypedLink(link: LinkCache, line: string): ITypedLink {
      // TODO: This is something specific I use, but shouldn't keep being in this repo.
      const regexPublishedIn = new RegExp(
          `^${this.regexEscape(this.settings.typedLinkPrefix)} (publishedIn) (\\d\\d\\d\\d) (${wikilinkRegex},? *)+$`);
      const matchPI = regexPublishedIn.exec(line);
      if (!(matchPI === null)) {
        return {
          type: 'publishedIn',
          isInline: false,
          properties: {
            year: matchPI[2],
            context: '',
          } as ITypedLinkProperties,
        } as ITypedLink;
      }

      // Intuition: Start with the typed link prefix. Then a neo4j name (nameRegex).
      // Then one or more of the wikilink group: wikilink regex separated by optional comma and multiple spaces
      const regex = new RegExp(
          `^${this.regexEscape(this.settings.typedLinkPrefix)} (${nameRegex}) (${wikilinkRegex},? *)+$`);
      const match = regex.exec(line);
      if (!(match === null)) {
        return {
          type: match[1],
          isInline: false,
          properties: {},
        } as ITypedLink;
      }
      return null;
    }

    public async queryCreateRels(file: TFile, query: Query, queryMetadata: QueryMetadata): Promise<Query> {
      const metadata = this.metadataCache.getFileCache(file);
      const content = (await this.vault.cachedRead(file)).split('\n');
      const tags = queryMetadata.tags;
      const srcVar = queryMetadata.nodeVars[file.basename];
      if (metadata) {
        const links = metadata.links;
        if (links === undefined) {
          return query;
        }
        links.forEach((link) => {
          let baseName = getLinkpath(link.link);//
          // Returns NULL for dangling notes!
          const trgtFile = this.metadataCache.getFirstLinkpathDest(baseName, file.path);

          if (trgtFile) {
            // This is an existing object.
            baseName = trgtFile.basename;
          }
          let trgtVar: string;
          if (baseName in queryMetadata.nodeVars) {
            trgtVar = queryMetadata.nodeVars[baseName];
          } else {
            // This node hasn't been seen before, so we need to create it.
            // Creates dangling nodes if untyped, otherwise creates attachment nodes
            queryMetadata.nodeIndex += 1;
            trgtVar = `n${queryMetadata.nodeIndex.toString()}`;
            queryMetadata.nodeVars[baseName] = trgtVar;

            const danglingTags = this.getDanglingTags(baseName, trgtFile);
            const properties = {
              SMD_community: tags.indexOf(danglingTags[0]),
              SMD_vault: this.vault.getName(),
              name: baseName,
            } as INoteProperties;
            if (trgtFile) {
              properties.SMD_path = trgtFile.path;
            }
            query = query.createNode(trgtVar, danglingTags, properties);
          }
          const line = content[link.position.start.line];
          let typedLink = this.parseTypedLink(link, line);
          if (typedLink === null) {
            typedLink = {
              isInline: true,
              type: 'inline',
              properties: {
                context: line,
              },

            } as ITypedLink;
          }

          query = query.create([
            node(srcVar),
            relation('out', [typedLink.type], typedLink.properties),
            node(trgtVar)]);
        });

        return query;
      }
      console.log('FIle without metadata');
      console.log(file);
      return null;
    }

    public async queryResetNode(file: TFile, query: Query, queryMetadata: QueryMetadata, session: Session): Promise<Query> {
      // todo: Is the basename the right name?
      const nodeVar = queryMetadata.nodeVars[file.basename];
      const result = await this.runQuery(new Query()
          .match(this.node(nodeVar, file.basename)).return(nodeVar), session);
      const dict: any = {};
      dict[nodeVar] = result.records[0];
      return query.setValues({}).removeLabels(dict);
    }

    async metadataCacheOnChanged(file: TAbstractFile) {
      // Note: This is NOT called on rename, unless there's a reflexive link to itself.
      // It's always called after the respective other events.
      // When a file is created, this is fired with an empty filecache
      // Called after create event. It shouldn't be needed to check if the node already exists on the server
      // with metadatacache changed..

      // Coding wise: We can change the queryCreateNote to accept an 'SET' (update) option, instead of create.
      // Then first to a MATCH statement with var n, register n in the nodeVarialbeIndex to the files baseName,
      // and perform the set. Shouldn't need to change anything else. SET doesn't remove old data, it seems.
      // There should also first be a clause to clear the properties and labels. However, there doesn't seem to
      // be a 'properties'  or 'labels'
      // For this, REMOVE exists:
      // query.remove({
      //     labels: {
      //         coupon: 'Active',
      //     },
      //     properties: {
      //         customer: ['inactive', 'new'],
      //     },
      // });
      // which removes the label Active from variable coupon and properties inactive and new from customer
      console.log('changed metadata');
      console.log(file);
      const session = this.session();
      if (file instanceof TFile) {
        const name = file.basename;
        const queryMetadata = this.queryMetadata();
        const nodeVar = 'n0';
        // Find all labels on node
        const result = await this.runQuery(
            new Query().match(this.node(nodeVar, name)).return(nodeVar), session);
        console.log(result);
        const oldLabels = result.records[0].get(0).labels;

        if (oldLabels.length > 0) {
          console.log(oldLabels);
          // Remove all labels on node
          await this.runQuery(new Query().match(this.node(nodeVar, name))
              // @ts-ignore
              .removeLabels({n0: oldLabels}), session);
        }

        queryMetadata.nodeIndex = 1;
        queryMetadata.nodeVars[name] = nodeVar;
        console.log(this.metadataCache.getFileCache(file as TFile));
        let query = new Query().match(this.node(nodeVar, name));
        // Update node with new info
        query = await this.queryUpdateNote(file, query, queryMetadata);
        await this.executeQueries([query], session);
        this.trigger('modifyNode', name);
      }
      await session.close();
    }

    async vaultOnRename(file: TAbstractFile, oldPath: string) {
      // This is called BEFORE metadataCache vault change.
      // So if we just rename the neo4j node, it should be fine when rebuilding relations. But rebuilding relations
      // should happen before the rename event is resolved... Hopefully it works async
      const oldName = basename(oldPath, '.md');
      if (file instanceof TFile) {
        const query = new Query().match(this.node('n', oldName))
            .setValues({n: {name: file.basename}}, true);
        await this.executeQueries([query]);
        this.trigger('renameNode', oldName, file.basename);
      }
      this.lastFileEvent = 'rename';
      console.log('onRename');
      console.log(file);
      console.log(oldPath);
      console.log(oldName);
    }

    async vaultOnModify(file: TAbstractFile) {
      // Called BEFORE metadataCache changed event.
      // At this point, the metadataCache HASN'T been updated yet!
      // It shouldn't be needed to do anything related with relation/tag updating here.
      // At most, we could update the content property of the node.
      this.lastFileEvent = 'modify';
      console.log('onModify');
      console.log(file);
    }

    async vaultOnDelete(file: TAbstractFile) {
      // After deleting, no metadatacache changed event is fired.
      // Note: MetadataCache event isn't called either for incoming edges
      this.lastFileEvent = 'delete';
      console.log('onDelete');
      console.log(file);

      const session = this.session();

      if (file instanceof TFile) {
        const name = file.basename;
        const result = await this.runQuery(new Query().match([
          this.node('n', name),
          relation('in'),
          node('m')]).return('n'), session,
        );
        console.log(result);
        if (result.records.length === 0) {
          // If there are no incoming links, detach delete the node
          await this.executeQueries([
            new Query().match(this.node('n', name))
                .detachDelete('n')], session);
          this.trigger('modifyNode', name);
        } else {
          // If there are any incoming links, change labels to dangling and empty properties
          await this.executeQueries([
            await this.queryResetNode(file, new Query(), this.queryMetadata(), session),
          ], session);
          this.trigger('modifyNode', name);
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
      console.log(file);
      const session = this.session();
      console.log('sess created');
      if (file instanceof TFile) {
        const name = file.basename;
        const result = await this.runQuery(new Query().match(this.node('n', name))
            .return('n'), session);
        console.log(result);
        if (result.records.length == 0) {
          // if not exists:
          await this.executeQueries([new Query().create(this.node('n', name))], session);
          this.trigger('createNode', name);
        }
        console.log('exit onCreate');
      }
    }

    public async stop() {
      this.events.forEach((event) => {
        this.vault.offref(event);
      });
      this.events = [];
      await this.driver.close();
      this.tags = [...initialTags];
    }

    trigger(name: 'renameNode', oldName: string, newName: string): void;
    trigger(name: 'deleteNode', param: string): void;
    trigger(name: 'modifyNode', param: string): void;
    trigger(name: 'createNode', param: string): void;
    trigger(name: string, ...data: any[]): void {
      super.trigger(name, ...data);
    }

    public on(name: 'renameNode', callback: (oldName: string, newName: string) => any, ctx?: any): EventRef;
    public on(name: 'deleteNode', callback: (name: string) => any, ctx?: any): EventRef;
    public on(name: 'modifyNode', callback: (name: string) => any, ctx?: any): EventRef;
    public on(name: 'createNode', callback: (name: string) => any, ctx?: any): EventRef;
    on(name: string, callback: (...data: any[]) => any, ctx?: any): EventRef {
      return super.on(name, callback, ctx);
    }
}
