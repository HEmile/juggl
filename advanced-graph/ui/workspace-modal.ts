import {Modal} from 'obsidian';
import SaveWorkspaces from './SaveWorkspaces.svelte';

export class WorkspaceModal extends Modal {
  onOpen() {
    super.onOpen();
    this.titleEl.innerHTML = 'Manage workspace graphs';
    new SaveWorkspaces({
      target: this.contentEl,
      props: {
        onSave: (s:string ) => console.log(s),
        savedGraphs: ['graph name 1!', 'another graph'],
        onLoad: (s: string) => console.log(s),
      },
    });
  }
}
