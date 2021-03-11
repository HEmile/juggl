import type {Component} from 'obsidian';
import type {DataStoreEvents} from './events';
import type {EdgeDefinition, NodeCollection, NodeDefinition} from 'cytoscape';
import type {Menu} from 'obsidian';
import type {NodeSingular} from 'cytoscape';
import type {TFile} from 'obsidian';
import type {Juggl} from './viz/visualization';
import type {Collection} from 'cytoscape';

export interface INoteProperties {
    SMD_community: number;
    // TODO: Re-add this.
    // obsidian_url: string;
    SMD_path: string;
    SMD_vault: string;
    name: string;
    content: string;
    [key: string]: any;
}


export interface ITypedLinkProperties {
    context: string;
    type: string;
    [key: string]: any;
}

export interface ITypedLink {
    properties: ITypedLinkProperties;
    isInline: boolean;
    class: string;
}

export interface IDataStore extends Component {

    getEvents(): DataStoreEvents;


    getNeighbourhood(nodeId: VizId[]): Promise<NodeDefinition[]>;

    connectNodes(allNodes: NodeCollection, newNodes: NodeCollection, graph: Juggl): Promise<EdgeDefinition[]>;

    refreshNode(view: Juggl, id: VizId): void | Promise<void>;

    // Prefix of id of nodes from this store
    storeId(): string;

}

export interface ICoreDataStore extends IDataStore {

    get(nodeId: VizId): Promise<NodeDefinition>;
}

type IDataStores = IDataStore[];

export interface IJugglStores {
   coreStore: ICoreDataStore;
   dataStores: IDataStore[];
}

export interface IAGMode extends Component {
    getName(): string;

    fillMenu(menu: Menu, nodes: NodeCollection): void;

    createToolbar(element: Element): void;

}

export class VizId {
    id: string;
    storeId: string;
    constructor(id: string, storeId: string) {
      this.id = id;
      this.storeId = storeId;
    }

    toString(): string {
      return `${this.storeId}:${this.id}`;
    }

    toId(): string {
      return this.toString();
    }

    static fromId(id: string): VizId {
      const split = id.split(':');
      const storeId = split[0];
      const _id = split.slice(1).join(':');
      return new VizId(_id, storeId);
    }

    static fromNode(node: NodeSingular): VizId {
      return VizId.fromId(node.id());
    }

    static fromNodes(nodes: NodeCollection) : VizId[] {
      return nodes.map((n) => VizId.fromNode(n));
    }

    static fromFile(file: TFile): VizId {
      const name = file.extension === 'md' ? file.basename : file.name;
      return new VizId(name, 'core');
    }

    static fromPath(path: string): VizId {
      const pth = require('path');
      const name = pth.basename(path, '.md');
      return new VizId(name, 'core');
    }

    static toId(id: string, storeId: string) : string {
      return new VizId(id, storeId).toId();
    }
}

export interface IMergedToGraph {
    merged: Collection;
    added: Collection;
}

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
