import {App, Modal} from 'obsidian';
import GlobalGraphModal from './GlobalGraphModal.svelte';

export class GlobalWarningModal extends Modal {
  constructor(app: App, callback: () => any) {
    super(app);
    const modal = this;
    new GlobalGraphModal({target: this.modalEl, props: {
      cancelCallback: this.close.bind(modal),
      continueCallback: callback,
    }});
  }
}
