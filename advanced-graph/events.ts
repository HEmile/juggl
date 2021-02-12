import {EventRef, Events} from 'obsidian';

export class DataStoreEvents extends Events {
  trigger(name: 'renameNode', oldName: string, newName: string): void;
  trigger(name: 'deleteNode', param: string): void;
  trigger(name: 'modifyNode', param: string): void;
  trigger(name: 'createNode', param: string): void;
  trigger(name: string, ...data: any[]): void {
    console.log('on trigger');
    console.log(name, data);
    super.trigger(name, ...data);
  }

  public on(name: 'renameNode', callback: (oldName: string, newName: string) => any, ctx?: any): EventRef;
  public on(name: 'deleteNode', callback: (name: string) => any, ctx?: any): EventRef;
  public on(name: 'modifyNode', callback: (name: string) => any, ctx?: any): EventRef;
  public on(name: 'createNode', callback: (name: string) => any, ctx?: any): EventRef;
  on(name: string, callback: (...data: any[]) => any, ctx?: any): EventRef {
    return super.on(name, callback, ctx);
  }
}
