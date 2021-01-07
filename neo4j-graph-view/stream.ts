import Neo4jViewPlugin from "./main";
import {CachedMetadata, FrontMatterCache, MetadataCache, parseFrontMatterAliases, Vault, Workspace} from "obsidian";
import {INeo4jViewSettings} from "./settings";
import {
    TAbstractFile, TFile,
} from 'obsidian';
import {Query, Builder} from "cypher-query-builder";
import {Session} from "neo4j-driver";
import neo4j from "neo4j-driver";

export const CAT_DANGLING = "SMD_dangling";
export const CAT_NO_TAGS = "SMD_no_tags";

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

export class Neo4jStream {
    plugin: Neo4jViewPlugin;
    workspace: Workspace;
    settings: INeo4jViewSettings;
    vault: Vault;
    metadataCache: MetadataCache;
    connection: Session;

    constructor(plugin: Neo4jViewPlugin) {
        this.plugin = plugin;
        this.workspace = plugin.app.workspace;
        this.vault = plugin.app.vault;
        this.settings = plugin.settings;
        this.metadataCache = plugin.app.metadataCache;
    }

    public async start() {
        if (this.connection) {
            await this.connection.close();
        }


        let driver = neo4j.driver("neo4j://localhost",
            neo4j.auth.basic('neo4j', this.settings.password), {
                maxTransactionRetryTime: 30000
            });
        this.connection = driver.session();
        if (this.settings.debug) {
            console.log("Removing existing data");
        }

        // await this.connection.run("MATCH (n) RETURN n LIMIT 10").then(res => {
        //     console.log(res);
        // });

        await this.runQueries([new Query()
            .matchNode('n', { SMD_vault: this.vault.getName()})
            .detachDelete("n")]);
        console.log("Iterating md files");
        let tags: string[] = [CAT_NO_TAGS];
        let noteQueries: Query[] = [];
        let markdownFiles = this.vault.getMarkdownFiles();
        for (let i in markdownFiles) {
            let file = markdownFiles[i];
            noteQueries.push(await this.queryCreateNote(file, tags));
        }

        console.log("Pushing notes");
        await this.runQueries(noteQueries);
        // TODO: Remove this.
        await this.connection.close();
    }

    public async runQueries(queries: Query[]) {
        for (let i in queries) {
            let query = queries[i].buildQueryObject();
            if (this.settings.debug) {
                console.log(query);
            }
            // Note: The await here is important, as a connection cannot run multiple transactions simultaneously.
            await this.connection.run(query.query, query.params).then(value => {
                console.log(value);
            }).catch(reason => {
                console.log("Query failed");
                console.log(query);
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

    public async queryCreateNote(file: TFile, tags: string[]): Promise<Query>{
        let metadata = this.metadataCache.getFileCache(file);
        if (metadata) {
            let frontmatter = metadata.frontmatter;
            let community_tag = metadata.tags ? metadata.tags[0].tag.slice(1) : CAT_NO_TAGS;
            if(!(tags.includes(community_tag))) {
                tags.push(community_tag);
            }
            let properties = {
                // TODO: Probably best to deprecate communities at some point
                SMD_community: community_tag ? tags.indexOf(community_tag): 0,
                SMD_path: file.path,
                SMD_vault: this.vault.getName(),
                name: file.basename,
                content: await this.vault.read(file)
            } as INoteProperties;
            if (frontmatter) {
                Object.keys(frontmatter).forEach(k => {
                    if (!(k=== "position")) {
                        properties[k] = frontmatter[k];
                    }
                });
            }
            return new Query().createNode("n",
                metadata.tags ? metadata.tags.map(tag => {
                    // Escape the hastag
                    return tag.tag.slice(1);
                }) : CAT_NO_TAGS,
                properties
            );
        }
        console.log("FIle without metadata");
        console.log(file);
        return null;
    }

    public async stop() {
        await this.connection.close();
    }


}