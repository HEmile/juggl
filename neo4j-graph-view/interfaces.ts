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
