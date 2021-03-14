<script lang="ts">
    import {icons} from "../icons";
    import {Core} from "cytoscape";
    import ToolbarButton from "./ToolbarButton.svelte";
    import {debounce, Workspace} from "obsidian";
    import HelpButton from "./HelpButton.svelte";

    export let viz: Core;
    export let filterValue: string;
    export let fdgdClick;
    export let concentricClick;
    export let gridClick;
    export let hierarchyClick;
    export let expandClick;
    export let collapseClick;
    export let hideClick;
    export let selectAllClick;
    export let selectInvertClick;
    export let selectNeighborClick;
    export let lockClick;
    export let unlockClick;
    export let fitClick;
    export let localModeClick;
    export let filterInput;
    export let saveClick;
    export let workspace: Workspace;

    filterInput = debounce(filterInput, 500, true);

    let disableOnNoneSelected = false;
    let disableOnAllPinned = false;
    let disableOnNonePinned = true;

    export const onSelect = function () {
        let selected = viz.nodes(":selected");
        disableOnNoneSelected = selected.length === 0;
        // TODO: Hardcoded class
        let pinned = viz.nodes(".pinned");
        let anyUnpinned = selected.difference(pinned).length > 0
        let anyPinned = selected.intersection(pinned);
        disableOnAllPinned = !anyUnpinned || disableOnNoneSelected;
        disableOnNonePinned = !anyPinned || disableOnNoneSelected;
    }

</script>


<!--<div class="cy-toolbar">-->
<div class="cy-toolbar-section">
    <ToolbarButton icon={icons.ag_fdgd} onClick={fdgdClick} title="Force directed layout"/>
    <ToolbarButton icon={icons.ag_concentric} onClick={concentricClick} title="Circle layout"/>
    <ToolbarButton icon={icons.ag_grid} onClick={gridClick} title="Grid layout"/>
    <ToolbarButton icon={icons.ag_hierarchy} onClick={hierarchyClick} title="Hierarchical layout"/>
</div>
<div class="cy-toolbar-section">
    <ToolbarButton icon={icons.ag_fit} onClick={fitClick} title="Fit view"/>
    <ToolbarButton icon={icons.ag_local} onClick={localModeClick} title="Local mode"/>
</div>
<div class="cy-toolbar-section">
    <HelpButton {workspace} />
    <ToolbarButton icon={icons.ag_save} onClick={saveClick} title="Manage workspace graphs" />
</div>
<div class="cy-toolbar-section">
    <ToolbarButton icon={icons.ag_expand} onClick={expandClick}
                   disabled="{disableOnNoneSelected}" title="Expand selected nodes (E)"/>
    <ToolbarButton icon={icons.ag_collapse} onClick={collapseClick}
                   disabled="{disableOnNoneSelected}" title="Collapse expanded nodes (C)"/>
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
<!--</div>-->
<br /><label for="ag-filter">Filter: </label><input type="text" id="ag-filter"
                                                    name="ag-filter" on:input={filterInput} value={filterValue}>