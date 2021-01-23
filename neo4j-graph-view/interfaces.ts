import {Component} from 'obsidian';
import {DataStoreEvents} from './events';
import {EdgeDefinition, NodeCollection, NodeDefinition} from 'cytoscape';
import {VizId} from './visualization';

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

    getNeighbourhood(nodeId: VizId): Promise<NodeDefinition[]>;

    connectNodes(allNodes: NodeCollection, newNodes: VizId[]): Promise<EdgeDefinition[]>;

    // Prefix of id of nodes from this store
    storeId(): string;

}
