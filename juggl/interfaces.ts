
// From https://github.com/jplattel/obsidian-query-language/blob/4840e5da6ff5d94dfcba8ff6c900421300466de6/src/search.ts#L3
export interface IFuseFile {
    [index:string]: any;
    title: string;
    path: string;
    content: string;
    created: any;
    modified: any;
    tags?: string[];
    frontmatter?: any;
}
