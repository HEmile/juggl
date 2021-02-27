import {App, Modal} from 'obsidian';
import SaveWorkspaces from './SaveWorkspaces.svelte';
import type {WorkspaceManager} from '../viz/workspaces/workspace-manager';
import type {Juggl} from '../viz/visualization';

export class WorkspaceModal extends Modal {
  manager: WorkspaceManager;
  view: Juggl;
  constructor(app: App, workspaceManager: WorkspaceManager, view: Juggl) {
    super(app);
    this.manager = workspaceManager;
    this.view = view;
  }
  onOpen() {
    super.onOpen();
    this.titleEl.innerHTML = 'Manage workspace graphs';
    new SaveWorkspaces({
      target: this.contentEl,
      props: {
        onSave: (s:string ) => this.manager.saveGraph(s, this.view),
        savedGraphs: this.manager.graphs,
        onLoad: (s: string) => this.manager.loadGraph(s, this.view),
        onDelete: (s: string) => this.manager.deleteGraph(s, this.view),
      },
    });
  }
}
