import {Component} from 'obsidian';
import {DataStoreEvents} from './events';

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
    [key: string]: any;
}

export interface ITypedLink {
    properties: ITypedLinkProperties;
    isInline: boolean;
    type: string;
}

export interface IDataStore extends Component {

    getEvents(): DataStoreEvents;

}
