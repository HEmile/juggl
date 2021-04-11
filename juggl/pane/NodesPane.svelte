<script lang="ts">
    import {Juggl} from "../viz/visualization";
    import {NodeCollection, NodeSingular} from "cytoscape";
    import cytoscape from "cytoscape";
    import {CLASS_HARD_FILTERED} from "../constants";
    import NodesList from "./NodesList.svelte";
    import {Menu} from "obsidian";
    import {VizId} from "../interfaces";
    import {icons} from '../ui/icons';

    let viz: Juggl = null;
    let visible: NodeCollection = cytoscape().collection();
    let hidden: NodeCollection = cytoscape().collection();
    export const setViz = function (juggl: Juggl) {
        if (!juggl) {
            viz = null;
            visible = cytoscape().collection();
            hidden = cytoscape().collection();
            return;
        }
        viz = juggl;
        // TODO: Can probably do something like not HARD FILTERED, rather than relying on styling.
        visible = viz.viz.nodes(":visible");
        hidden = viz.viz.nodes(`.${CLASS_HARD_FILTERED}`);
    }
    let ctxMenu = function(node: NodeSingular, e: MouseEvent) {
        const fileMenu = new Menu(); // Creates empty file menu
        const id = VizId.fromNode(node);
        const file = viz.plugin.metadata.getFirstLinkpathDest(id.id, '');
        if (!(file === undefined)) {
            // hook for plugins to populate menu with "file-aware" menu items
            viz.plugin.app.workspace.trigger('file-menu', fileMenu, file, 'my-context-menu', null);
        }
        viz.mode.fillMenu(fileMenu, node);
        fileMenu.showAtPosition({x: e.x, y: e.y});
    }
    let clickTxt = function(node: NodeSingular, e: MouseEvent) {
        viz.plugin.openFileFromNode(node, e.metaKey);
    }
    let filterButtonClick = function(node: NodeSingular) {
        node.removeClass(CLASS_HARD_FILTERED);
        viz.onGraphChanged(true, true);
    }
</script>

<div class="juggl-nodes-pane">
    <NodesList nodes={visible} name="Nodes in graph" ctxmenu={ctxMenu} onClickText={clickTxt}/>

    <NodesList nodes={hidden} name="Hidden nodes" ctxmenu={ctxMenu} onClickText={clickTxt} icon={icons.ag_unhide}
    icon_tooltip="Show in graph" onClickButton={filterButtonClick} />
</div>