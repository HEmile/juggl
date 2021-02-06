// Attribution: https://github.com/Reocin/obsidian-markdown-formatting-assistant-plugin/blob/main/src/icons.ts
import {addIcon} from 'obsidian';
import * as mdiIcons from '@mdi/js';

function pathToSvg(icon: string) {
  return `
    <svg style= "width:24px;height:24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="currentcolor" d="${icon}" />
    </svg>`;
}
export const icons: Record<string, string> = {
  ag_expand: mdiIcons.mdiArrowExpandAll,
  ag_select_all: mdiIcons.mdiSelectAll,
  ag_select_inverse: mdiIcons.mdiSelectCompare,
  ag_select_neighbors: mdiIcons.mdiSelectGroup,
  ag_lock: mdiIcons.mdiLock,
  ag_unlock: mdiIcons.mdiLockOpenVariantOutline,
  ag_hide: mdiIcons.mdiEyeOff,
  ag_fit: mdiIcons.mdiFitToPageOutline,
  ag_image: mdiIcons.mdiImage,
  ag_workspace: mdiIcons.mdiToolboxOutline,
  ag_local: mdiIcons.mdiFlare,
};

export const addIcons = (): void => {
  Object.keys(icons).forEach((key) => {
    addIcon(key.replace('_', '-').replace('_', '-'), pathToSvg(icons[key]));
  });
};
