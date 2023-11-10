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
    export let onDepthChange;

    let depth = 1;
    const minDepth = 0;
    const maxDepth = 10;
    filterInput = debounce(filterInput, 500, true);

    const increment = function(e) {
        depth = Math.min(depth + 1, maxDepth);
        onDepthChange(depth);
    }
    const decrement = function(e) {
        depth = Math.max(depth - 1, minDepth);
        onDepthChange(depth);
    }
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
<!--<div class="cy-toolbar-section">-->
<!--    <div class="juggl-inline-group">-->
<!--        <div class="input-group-prepend">-->
<!--            <button class="btn-outline-secondary btn-minus" on:click={decrement}>-->
<!--                - -->
<!--            </button>-->
<!--        </div>-->
<!--        <input class="quantity form-control" id="depth" min="0" max="10" value={depth} type="number">-->
<!--        <div class="input-group-append">-->
<!--            <button class="btn-outline-secondary btn-plus" on:click={increment}>-->
<!--                +-->
<!--            </button>-->
<!--        </div>-->
<!--    </div>-->
<!--    <HelpButton {workspace}/>-->
<!--</div>-->


<br /><input type="text" id="ag-filter" name="ag-filter" on:input={filterInput} value={filterValue}>