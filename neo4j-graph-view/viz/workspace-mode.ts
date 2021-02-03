import type {IAGMode} from '../interfaces';


export class WorkspaceMode implements IAGMode {
  constructor() {
  }

  getName(): string {
    return 'workspace';
  }
}
