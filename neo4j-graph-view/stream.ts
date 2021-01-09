import Neo4jViewPlugin from "./main";
import {
    getLinkpath, LinkCache,
    MetadataCache,
    Vault,
    Workspace
} from "obsidian";
import {INeo4jViewSettings} from "./settings";
import {
    TAbstractFile, TFile,
} from 'obsidian';
import {Query, Builder, node, relation} from "cypher-query-builder";
import {Session} from "neo4j-driver";
import neo4j from "neo4j-driver";

export const CAT_DANGLING = "SMD_dangling";
export const CAT_NO_TAGS = "SMD_no_tags";
export const nameRegex = "[^\\W\\d]\\w*";
// Match around [[ and ]], and ensure content isn't a wikilnk closure
// This doesn't explicitly parse aliases.
export const wikilinkRegex = "\\[\\[([^\\]\\r\\n]+?)\\]\\]";

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

interface IVarIndex {
    [key: string]: string;
}

interface QueryMetadata {
    nodeIndex: number;
    relIndex: number;
    nodeVars: IVarIndex;
    relVars: IVarIndex;
    tags: string[];
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
        // let noteQueries: Query[] = [];
        let markdownFiles = this.vault.getMarkdownFiles();
        let query = new Query();
        let queryMetadata = {
            nodeIndex: 0,
            relIndex: 0,
            nodeVars: {} as IVarIndex,
            relVars: {} as IVarIndex,
            tags: ["image", "audio", "video", "pdf", "file", CAT_NO_TAGS, CAT_DANGLING]
        } as QueryMetadata;
        for (let i in markdownFiles) {
            let file = markdownFiles[i];
            queryMetadata.nodeVars[file.basename] = "n" + i;
            queryMetadata.nodeIndex = parseInt(i);
            query = await this.queryCreateNote(file, query, queryMetadata);
        }

        // console.log("Pushing notes");
        // await this.runQueries([query]);

        for (let i in markdownFiles) {
            let file = markdownFiles[i];
            await this.queryCreateRels(file, query, queryMetadata);
        }

        console.log("Pushing to Neo4j");
        await this.runQueries([query]);

        // TODO: Remove this.
        await this.connection.close();
    }//

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

    public async queryCreateNote(file: TFile, query: Query, queryMetadata: QueryMetadata): Promise<Query>{
        let metadata = this.metadataCache.getFileCache(file);
        let tags = queryMetadata.tags;
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
            return query.createNode(queryMetadata.nodeVars[file.basename],
                (metadata.tags ? metadata.tags.map(tag => {
                    // Escape the hastag
                    return tag.tag.slice(1);
                }) : [CAT_NO_TAGS]).concat(
                    file.parent.path === "/" ? [] : [file.parent.name]
                ),
                properties
            );
        }
        console.log("FIle without metadata");
        console.log(file);
        return null;
    }

    public getDanglingTags(basename: string, file: TFile): string[] {
        if (file) {
            let tags = [];
            if (["png", "jpg", "jpeg", "gif", "bmp", "svg", "tiff"].includes(file.extension)) {
                tags.push("image");
            }
            else if (["mp3", "webm", "wav", "m4a", "ogg", "3gp", "flac"].includes(file.extension)) {
                tags.push("audio");
            }
            else if (["mp4", "webm", "ogv"].includes(file.extension)) {
                tags.push("video");
            }
            else if (file.extension === "pdf") {
                tags.push("PDF");
            }
            if (!(file.parent.name === "/")) {
                tags.push(file.parent.name);
            }
            tags.push("file");
            return tags;
        }
        return [CAT_DANGLING];
    }

    regexEscape(str: string) {
        return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    }

    public parseTypedLink(link: LinkCache, line: string): ITypedLink {
        // Intuition: Start with the typed link prefix. Then a neo4j name (nameRegex).
        // Then one or more of the wikilink group: wikilink regex separated by optional comma and multiple spaces
        let regex = new RegExp(
            `^${this.regexEscape(this.settings.typed_link_prefix)} (${nameRegex}) (${wikilinkRegex},? *)+$`);
        let match = regex.exec(line);
        if (!(match === null)) {
            return {
                type: match[1],
                isInline: false,
                properties: {}
            } as ITypedLink;
        }
        return null;
    }

    public async queryCreateRels(file: TFile, query: Query, queryMetadata: QueryMetadata): Promise<Query>{
        let metadata = this.metadataCache.getFileCache(file);
        let content = (await this.vault.read(file)).split("\n");
        let tags = queryMetadata.tags;
        let srcVar = queryMetadata.nodeVars[file.basename];
        if (metadata) {
            let links = metadata.links;
            links.forEach(link => {
                console.log(link);
                let baseName = getLinkpath(link.link);//
                // Returns NULL for dangling notes!
                let trgtFile = this.metadataCache.getFirstLinkpathDest(baseName, file.path);
                console.log(trgtFile?.basename);

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

                    let danglingTags = this.getDanglingTags(baseName, trgtFile);
                    let properties = {
                        SMD_community: tags.indexOf(danglingTags[0]),
                        SMD_vault: this.vault.getName(),
                        name: baseName,
                    } as INoteProperties;
                    if (trgtFile) {
                        properties.SMD_path = trgtFile.path;
                    }
                    query = query.createNode(trgtVar, danglingTags, properties);
                }
                let line = content[link.position.start.line];
                let typedLink = this.parseTypedLink(link, line);
                if (typedLink === null) {
                    typedLink = {
                        isInline: true,
                        type: "inline",
                        properties: {
                            context: line
                        }

                    } as ITypedLink;
                }

                query = query.create([
                    node(srcVar),
                    relation("out", [typedLink.type], typedLink.properties),
                    node(trgtVar)]);
            });

            return query;
        }
        console.log("FIle without metadata");
        console.log(file);
        return null;
    }

    public async stop() {
        await this.connection.close();
    }


}