<script lang="ts">
    import {icons} from "../icons";
    // import {Core} from "cytoscape";
    import ToolbarButton from "./ToolbarButton.svelte";
    import HelpButton from "./HelpButton.svelte";
    import {debounce, Workspace} from "obsidian";

    export let fdgdClick;
    export let concentricClick;
    export let gridClick;
    export let hierarchyClick;
    export let fitClick;
    export let workspaceModeClick;
    export let filterInput;
    export let filterValue;
    export let workspace: Workspace;
    filterInput = debounce(filterInput, 500, true);

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
<div class="cy-toolbar-section">
    <HelpButton {workspace}/>
</div>
<br /><label for="ag-filter">Filter: </label><input type="text" id="ag-filter" name="ag-filter" on:input={filterInput} value={filterValue}>