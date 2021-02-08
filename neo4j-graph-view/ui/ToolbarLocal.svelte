<script lang="ts">
    import {icons} from "./icons";
    // import {Core} from "cytoscape";
    import ToolbarButton from "./ToolbarButton.svelte";

    export let fitClick;
    export let workspaceModeClick;

</script>

<div class="cy-toolbar-section">
    <ToolbarButton icon={icons.ag_fit} onClick={fitClick} title="Fit view"/>
    <ToolbarButton icon={icons.ag_workspace} onClick={workspaceModeClick} title="Workspace mode"/>
</div>
<div class="cy-toolbar-section">
    <ToolbarButton icon={icons.ag_fit} onClick={fitClick} title="Fit view"/>
    <ToolbarButton icon={icons.ag_workspace} onClick={workspaceModeClick} title="Workspace mode"/>
</div>