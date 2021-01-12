import Neo4jViewPlugin from './main';
import {
  EventRef,
  getLinkpath, LinkCache,
  MetadataCache, Notice,
  Vault,
  Workspace,
} from 'obsidian';
import {INeo4jViewSettings} from './settings';
import {
  TAbstractFile, TFile,
} from 'obsidian';
import {Query, node, relation, NodePattern} from 'cypher-query-builder';
import {Result, Session} from 'neo4j-driver';
import neo4j from 'neo4j-driver';

export const CAT_DANGLING = 'SMD_dangling';
export const CAT_NO_TAGS = 'SMD_no_tags';
export const nameRegex = '[^\\W\\d]\\w*';
// Match around [[ and ]], and ensure content isn't a wikilnk closure
// This doesn't explicitly parse aliases.
export const wikilinkRegex = '\\[\\[([^\\]\\r\\n]+?)\\]\\]';

interface INoteProperties {
    SMD_community: number;
    // TODO: Re-add this.
    // obsidian_url: string;
    SMD_path: string;
    SMD_vault: string;
    name: string;
    content: string;
    [key: string]: any;
}


interface ITypedLinkProperties {
    context: string;
    [key: string]: any;
}

interface ITypedLink {
    properties: ITypedLinkProperties;
    isInline: boolean;
    type: string;
}

interface QueryMetadata {
    nodeIndex: number;
    relIndex: number;
    nodeVars: Record<string, string>;
    relVars: Record<string, string>;
    tags: string[];
}

const emptyQueryMetadata = function() {
  return {
    nodeIndex: 0,
    relIndex: 0,
    nodeVars: {},
    relVars: {},
    tags: [],
  } as QueryMetadata;
};

export class Neo4jStream {
    plugin: Neo4jViewPlugin;
    workspace: Workspace;
    settings: INeo4jViewSettings;
    vault: Vault;
    metadataCache: MetadataCache;
    connection: Session;
    lastFileEvent: string;
    events: EventRef[];

    constructor(plugin: Neo4jViewPlugin) {
      this.plugin = plugin;
      this.workspace = plugin.app.workspace;
      this.vault = plugin.app.vault;
      this.settings = plugin.settings;
      this.metadataCache = plugin.app.metadataCache;
    }

    public async start() {
      if (this.connection) {
        await this.stop();
      }

      const driver = neo4j.driver('neo4j://localhost',
          neo4j.auth.basic('neo4j', this.settings.password), {
            maxTransactionRetryTime: 30000,
          });
      this.connection = driver.session();
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
      const queryMetadata = {
        nodeIndex: 0,
        relIndex: 0,
        nodeVars: {},
        relVars: {},
        tags: ['image', 'audio', 'video', 'pdf', 'file',
          CAT_NO_TAGS, CAT_DANGLING],
      } as QueryMetadata;

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
      await this.executeQueries([query]);

      // TODO: Define schema/indexes

      this.events = [];
      this.events.push(
          this.metadataCache.on('changed', (file) => this.metadataCacheOnChanged(file)));
      this.events.push(
          this.vault.on('rename', (file, oldPath) => this.vaultOnRename(file, oldPath)));
      this.events.push(this.vault.on('modify', (file) => this.vaultOnModify(file)));
      this.events.push(this.vault.on('delete', (file) => this.vaultOnDelete(file)));
      this.events.push(this.vault.on('create', (file) => this.vaultOnCreate(file)));

      new Notice('Neo4j stream online!');
      this.plugin.statusBar.setText('Neo4j stream online');
    }


    public runQuery(query: Query): Result {
      const queryO = query.buildQueryObject();
      if (this.settings.debug) {
        console.log(queryO);
      }
      return this.connection.run(queryO.query, queryO.params);
    }

    public async executeQueries(queries: Query[]) {
      for (const i in queries) {
        console.log(this);
        // Note: The await here is important, as a connection cannot run multiple transactions simultaneously.
        await this.runQuery(queries[i]).then((value) => {
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

    public async queryCreateNote(file: TFile, query: Query, queryMetadata: QueryMetadata): Promise<Query> {
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
          content: await this.vault.read(file),
        } as INoteProperties;
        if (frontmatter) {
          Object.keys(frontmatter).forEach((k) => {
            if (!(k=== 'position')) {
              properties[k] = frontmatter[k];
            }
          });
        }
        return query.createNode(queryMetadata.nodeVars[file.basename],
            (metadata.tags ? metadata.tags.map((tag) => {
              // Escape the hastag
              return tag.tag.slice(1);
            }) : [CAT_NO_TAGS]).concat(
                    file.parent.path === '/' ? [] : [file.parent.name],
            ),
            properties,
        );
      }
      console.log('FIle without metadata');
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
      const content = (await this.vault.read(file)).split('\n');
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

    public async queryResetNode(file: TFile, query: Query, queryMetadata: QueryMetadata): Promise<Query> {
      // todo: Is the basename the right name?
      const nodeVar = queryMetadata.nodeVars[file.basename];
      return this.runQuery(new Query()
          .match(this.node(nodeVar, file.basename)))
          .then((record) => {
            const dict: any = {};
            dict[nodeVar] = record.records[0];
            return query.setValues({}).removeLabels(dict);
          });
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
      console.log(this.metadataCache.getFileCache(file as TFile));
    }

    async vaultOnRename(file: TAbstractFile, oldPath: string) {
      // This is called BEFORE metadataCache vault change.
      // So if we just rename the neo4j node, it should be fine when rebuilding relations. But rebuilding relations
      // should happen before the rename event is resolved... Hopefully it works async
      const oldFile = this.vault.getAbstractFileByPath(oldPath);
      if (file instanceof TFile && oldFile instanceof TFile) {
        const query = new Query().match(this.node('n', oldFile.basename))
            .setValues({name: file.basename});
        await this.executeQueries([query]);
      }
      this.lastFileEvent = 'rename';
      console.log('onRename');
      console.log(file);
      console.log(oldPath);
    }

    async vaultOnModify(file: TAbstractFile) {
      // Called BEFORE metadataCache changed event.
      // At this point, the metadataCache HASN'T been updated yet!
      // It shouldn't be needed to do anything related with relation/tag updating here.
      // At most, we could update the content property of the node.
      this.lastFileEvent = 'modify';
      console.log('onModify');
      console.log(file);
      console.log(this.metadataCache.getFileCache(file as TFile));
    }

    async vaultOnDelete(file: TAbstractFile) {
      // After deleting, no metadatacache changed event is fired.
      // Note: MetadataCache event isn't called either for incoming edges
      this.lastFileEvent = 'delete';
      console.log('onDelete');
      console.log(file);

      if (file instanceof TFile) {
        const name = file.basename;
        this.runQuery(new Query().match([
          this.node('n', name),
          relation('in'),
          node('m')]).return('n'),
        ).then(async (result) => {
          console.log(result);
          if (result.records.length === 0) {
            // If there are no incoming links, detach delete the node
            await this.executeQueries([
              new Query().match(this.node('n', name))
                  .detachDelete('n')]);
          } else {
            // If there are any incoming links, change labels to dangling and empty properties
            await this.executeQueries([await this.queryResetNode(file, new Query(), emptyQueryMetadata())]);
          }
        });
      }
    }

    async vaultOnCreate(file: TAbstractFile) {
      // This is called BEFORE metadataCache vault change.
      // Create the node as a blank state, then fill in later with on metadatacache changed etc.
      // Note: it's possible the node already exists as a dangling node. In that case, just do nothing
      // and let the metadatacache event handle it
      this.lastFileEvent = 'create';
      console.log('onCreate');
      console.log(file);
      if (file instanceof TFile) {
        const name = file.basename;
        await this.runQuery(new Query().matchNode('n', {name: name, SMD_vault: this.vault.getName()})
            .return('n'))
            .then((result) => {
              if (result.records.length == 0) {
                // if not exists:
                this.executeQueries([new Query().createNode('n',
                    {name: name, SMD_vault: this.vault.getName()})]);
              }
              console.log(result);
            });
      }
    }

    public async stop() {
      this.events.forEach((event) => {
        this.vault.offref(event);
      });
      this.events = [];
      await this.connection.close();
    }
}
