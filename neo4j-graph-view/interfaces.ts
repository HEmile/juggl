import type {Component} from 'obsidian';
import type {DataStoreEvents} from './events';
import type {EdgeDefinition, NodeCollection, NodeDefinition} from 'cytoscape';
import type {VizId} from './viz/visualization';

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

    get(nodeId: VizId): Promise<NodeDefinition>;

    getNeighbourhood(nodeId: VizId[]): Promise<NodeDefinition[]>;

    connectNodes(allNodes: NodeCollection, newNodes: NodeCollection): Promise<EdgeDefinition[]>;

    // Prefix of id of nodes from this store
    storeId(): string;

}

export interface IAGMode {
    getName(): string;
}
