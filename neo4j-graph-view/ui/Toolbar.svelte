<script lang="ts">
    import {icons} from "./icons";
    import {Core} from "cytoscape";
    import ToolbarButton from "./ToolbarButton.svelte";

    export let viz: Core;
    export let expandClick;
    export let hideClick;
    export let selectAllClick;
    export let selectInvertClick;
    export let selectNeighborClick;
    export let lockClick;
    export let unlockClick;
    export let fitClick;

    let disableOnNoneSelected = false;
    let disableOnAllPinned = false;
    let disableOnNonePinned = true;

    export const onSelect = function () {
        let selected = viz.nodes(":selected");
        disableOnNoneSelected = selected.length === 0;
        let pinned = viz.nodes(":locked");
        let anyUnpinned = selected.difference(pinned).length > 0
        let anyPinned = selected.intersection(pinned);
        disableOnAllPinned = !anyUnpinned || disableOnNoneSelected;
        disableOnNonePinned = !anyPinned || disableOnNoneSelected;
    }

</script>

<div class="cy-toolbar" style="height: fit-content;
        width: 100%;
        margin: 0;
        margin-block-start: 0;
        margin-block-end: 0;">
    <div class="cy-toolbar-section">
        <ToolbarButton icon={icons.ag_expand} onClick={expandClick}
                       disabled="{disableOnNoneSelected}" title="Expand selected nodes (E)"/>
        <ToolbarButton icon={icons.ag_hide} onClick={hideClick}
                       disabled="{disableOnNoneSelected}" title="Hide selected nodes (H)"/>
    </div>
    <div class="cy-toolbar-section">
        <ToolbarButton icon={icons.ag_select_all} onClick={selectAllClick} title="Select all nodes (A)"/>
        <ToolbarButton icon={icons.ag_select_inverse} onClick={selectInvertClick}
                       disabled="{disableOnNoneSelected}" title="Invert selection (I)"/>
        <ToolbarButton icon={icons.ag_select_neighbors} onClick={selectNeighborClick}
                       disabled="{disableOnNoneSelected}" title="Select neighbors (N)"/>
    </div>
    <div class="cy-toolbar-section">
        <ToolbarButton icon={icons.ag_lock} onClick={lockClick}
                       disabled="{disableOnAllPinned}" title="Lock selected nodes in place (P)"/>
        <ToolbarButton icon={icons.ag_unlock} onClick={unlockClick}
                       disabled="{disableOnNonePinned}" title="Unlock selected nodes in place (U)"/>

    </div>
    <div class="cy-toolbar-section">
        <ToolbarButton icon={icons.ag_fit} onClick={fitClick} title="Fit view"/>
    </div>
</div>