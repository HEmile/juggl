// Attribution: https://github.com/Reocin/obsidian-markdown-formatting-assistant-plugin/blob/main/src/icons.ts
import {addIcon} from 'obsidian';
import * as mdiIcons from '@mdi/js';

export function pathToSvg(icon: string) {
  return `
    <svg style= "width:24px;height:24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="currentcolor" d="${icon}" />
    </svg>`;//
}
export const icons: Record<string, string> = {
  ag_expand: mdiIcons.mdiArrowExpandAll,
  ag_collapse: mdiIcons.mdiArrowCollapseAll,
  ag_select_all: mdiIcons.mdiSelectAll,
  ag_select_inverse: mdiIcons.mdiSelectCompare,
  ag_select_neighbors: mdiIcons.mdiSelectGroup,
  ag_lock: mdiIcons.mdiLock,
  ag_unlock: mdiIcons.mdiLockOpenVariantOutline,
  ag_hide: mdiIcons.mdiEyeOff,
  ag_unhide: mdiIcons.mdiEye,
  ag_fit: mdiIcons.mdiFitToPageOutline,
  ag_image: mdiIcons.mdiImage,
  ag_workspace: mdiIcons.mdiToolboxOutline,
  ag_local: mdiIcons.mdiFlare,
  ag_fdgd: mdiIcons.mdiGrain,
  ag_concentric: mdiIcons.mdiGraphql,
  ag_grid: mdiIcons.mdiDotsGrid,
  ag_hierarchy: mdiIcons.mdiGraph,
  ag_file: mdiIcons.mdiFileOutline,
  ag_filter: mdiIcons.mdiFilterOutline,
  ag_save: mdiIcons.mdiContentSave,
  ag_node_list: mdiIcons.mdiFormatListBulletedType,
  ag_style: mdiIcons.mdiPaletteOutline,
  ag_help: mdiIcons.mdiHelp,
};

export const addIcons = (): void => {
  Object.keys(icons).forEach((key) => {
    addIcon(key.replace('_', '-').replace('_', '-'), pathToSvg(icons[key]));
  });
};
