<script lang="ts">
    import {icons} from "./icons";
    // import {Core} from "cytoscape";
    import ToolbarButton from "./ToolbarButton.svelte";

    export let fdgdClick;
    export let concentricClick;
    export let gridClick;
    export let hierarchyClick;
    export let fitClick;
    export let workspaceModeClick;
    export let filterInput;

</script>

<div class="cy-toolbar-section">
    <ToolbarButton icon={icons.ag_fdgd} onClick={fdgdClick} title="Force directed layout"/>
    <ToolbarButton icon={icons.ag_concentric} onClick={concentricClick} title="Circle layout"/>
    <ToolbarButton icon={icons.ag_grid} onClick={gridClick} title="Grid layout"/>
    <ToolbarButton icon={icons.ag_hierarchy} onClick={hierarchyClick} title="Hierarchical layout"/>
</div>
<div class="cy-toolbar-section">
    <ToolbarButton icon={icons.ag_fit} onClick={fitClick} title="Fit view"/>
    <ToolbarButton icon={icons.ag_workspace} onClick={workspaceModeClick} title="Workspace mode"/>
</div>
<br /><label for="ag-filter">Filter: </label><input type="text" id="ag-filter" name="ag-filter" on:input={filterInput}>