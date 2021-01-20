import {Driver, Result, ResultSummary, Session} from 'neo4j-driver';
import {INeo4jViewSettings} from './settings';
import {getLinkpath, MetadataCache, Notice, TFile, Vault} from 'obsidian';
import Neo4jViewPlugin from './main';
import neo4j from 'neo4j-driver';
import {NodePattern, Query, node, relation} from 'cypher-query-builder';
import {INoteProperties, ITypedLink} from './interfaces';
import {QueryMetadata} from './stream';

export const CAT_DANGLING = 'SMD_dangling';
export const CAT_NO_TAGS = 'SMD_no_tags';
export const nameRegex = '[^\\W\\d]\\w*';
export const initialTags = ['image', 'audio', 'video', 'pdf', 'file', CAT_NO_TAGS, CAT_DANGLING];

export class Neo4jInterface {
  driver: Driver;
  settings: INeo4jViewSettings;
  plugin: Neo4jViewPlugin;
  metadataCache: MetadataCache;
  vault: Vault;
  tags: string[];

  constructor(plugin: Neo4jViewPlugin) {
    this.settings = plugin.settings;
    this.plugin = plugin;
    this.metadataCache = this.plugin.app.metadataCache;
    this.vault = this.plugin.app.vault;
    this.tags = [...initialTags];
  }

  public async start() {
    try {
      if (!(this.driver === undefined)) {
        await this.driver.close();
      }

      this.driver = neo4j.driver('neo4j://localhost',
          neo4j.auth.basic('neo4j', this.settings.password), {
            maxTransactionRetryTime: 30000,
          });
    } catch (e) {
      console.log('Error while establishing connection to Neo4j');
      console.log(e);
      this.plugin.statusBar.setText('Neo4j stream offline');
    }
  }

  public async shutdown() {
    if (this.driver) {
      new Notice('Stopping Neo4j stream');
      await this.driver.close();
      this.plugin.statusBar.setText('Neo4j stream offline');
      this.tags = [...initialTags];
    }
  }

  public session(): Session {
    return this.driver.session();
  }

  public node(varName: string, name: string): NodePattern {
    return node(varName, {name: name, SMD_vault: this.vault.getName()});
  }

  public runQuery(query: Query, session: Session|null=null): Result {
    let newSess = false;
    if (session === null) {
      newSess = true;
      session = this.session();
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
    for (const query of queries) {
      console.log(this);
      // Note: The await here is important, as a connection cannot run multiple transactions simultaneously.
      await this.runQuery(query, session).then((value) => {
        if (this.settings.debug) {
          console.log(value);
        }
      }).catch((reason) => {
        console.log('Query failed');
        console.log(query.buildQueryObject());
        console.log(reason);
      });
    }
  }

  public async queryUpdateNote(file: TFile, query: Query, queryMetadata: QueryMetadata): Promise<Query> {
    return this.queryCreateOrUpdateNote(file, query, queryMetadata, true);
  }

  public async queryCreateNote(file: TFile, query: Query, queryMetadata: QueryMetadata): Promise<Query> {
    return this.queryCreateOrUpdateNote(file, query, queryMetadata, false);
  }

  async queryCreateOrUpdateNote(file: TFile, query: Query, queryMetadata: QueryMetadata, update:boolean): Promise<Query> {
    const metadata = this.metadataCache.getFileCache(file);
    const tags = this.tags;
    if (metadata) {
      const frontmatter = metadata.frontmatter;
      console.log(this.metadataCache);
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
      const parentPath = file.parent.name.replace(' ', '_');
      const fileTag = parentPath === '/' || !new RegExp(nameRegex).test(parentPath) ?
          [] : [parentPath];
      const labels = (metadata.tags ? [].concat(...metadata.tags.map((tag) => {
        // Escape the hastag
        return tag.tag.slice(1)
            // deal with hierarchical tags
            .split('/');
      })) : [CAT_NO_TAGS])
          .concat(fileTag);
      console.log(labels);
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

  public async queryCreateRels(file: TFile, query: Query, queryMetadata: QueryMetadata, merge:boolean=false): Promise<Query> {
    const metadata = this.metadataCache.getFileCache(file);
    const content = (await this.vault.cachedRead(file)).split('\n');
    const tags = this.tags;
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
        } else if (trgtFile && merge) {
          // When merging, there's likely no var created for this note yet.
          trgtVar = queryMetadata.nextNodeVar(baseName);
          query = query.match(this.node(trgtVar, baseName))
          ;
        } else {
          // This node hasn't been seen before, so we need to create it.
          // Creates dangling nodes if untyped, otherwise creates attachment nodes
          trgtVar = queryMetadata.nextNodeVar(baseName);

          const danglingTags = this.plugin.getDanglingTags(baseName, trgtFile);
          const properties = {
            SMD_community: tags.indexOf(danglingTags[0]),
            SMD_vault: this.vault.getName(),
            name: baseName,
          } as INoteProperties;
          if (trgtFile) {
            properties.SMD_path = trgtFile.path;
          }
          if (merge) {
            query = query.merge(node(trgtVar, danglingTags, properties))
            ;
          } else {
            query = query.createNode(trgtVar, danglingTags, properties);
          }
        }
        const line = content[link.position.start.line];
        let typedLink = this.plugin.parseTypedLink(link, line);
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
        if (merge) {
          query.with(queryMetadata.values());
        }
      });

      return query;
    }
    console.log('File without metadata');
    console.log(file);
    return null;
  }
}
