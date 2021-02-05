<script lang="ts">
    import {icons} from "./icons";
    // import {Core} from "cytoscape";
    import ToolbarButton from "./ToolbarButton.svelte";

    // export let viz: Core;
    export let fitClick;

</script>

<div class="cy-toolbar" style="height: fit-content;
        width: 100%;
        margin: 0;
        margin-block-start: 0;
        margin-block-end: 0;">
    <div class="cy-toolbar-section">
        <ToolbarButton icon={icons.ag_fit} onClick={fitClick} title="Fit view"/>
    </div>
</div>