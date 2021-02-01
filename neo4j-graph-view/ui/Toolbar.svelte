<script lang="ts">
    // import {Writable, writable} from 'svelte/store';
    import {icons} from "./icons";
    import {Core} from "cytoscape";
    // export let viz: Writable<Core> = writable(undefined);
    export let viz: Core;
    export let expandClick;
    export let hideClick;
    export let selectAllClick;
    export let selectInvertClick;
    export let selectNeighborClick;
    export let lockClick;
    export let unlockClick;

    console.log("in script");
    // export let val: Number = 123;

    let toSvg = function(icon) {
        return `
    <svg style= "width:17px;height:17px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#828282" d="${icon}" />
    </svg>`;//
    }

    let disableOnNoneSelected = false;
    let disableOnAllPinned = false;
    let disableOnNonePinned = true;

    export const onSelect = function() {
        console.log(viz);
        console.log(disableOnNoneSelected);
        let selected = viz.nodes(":selected");
        disableOnNoneSelected = selected.length === 0;
        let pinned = viz.nodes(":locked");
        let anyUnpinned = selected.difference(pinned).length > 0
        let anyPinned = selected.intersection(pinned);
        disableOnAllPinned = !anyUnpinned && disableOnNoneSelected;
        disableOnNonePinned = !anyPinned && disableOnNoneSelected;
    }

</script>

<div class="cy-toolbar" style="height: 39px;
        width: 100%;
        margin: 0;
        margin-block-start: 0;
        margin-block-end: 0;">
    <div class="cy-toolbar-section">
        <button type="button" on:click={expandClick} title="Expand selected nodes (E)" disabled="{disableOnNoneSelected}">
            {@html toSvg(icons.ag_expand)}
        </button>
        <button type="button" on:click={hideClick} title="Hide selected nodes (H)" disabled="{disableOnNoneSelected}">
            {@html toSvg(icons.ag_hide)}
        </button>
    </div>
    <div class="cy-toolbar-section">
        <button type="button" on:click={selectAllClick} title="Select all nodes (A)">
            {@html toSvg(icons.ag_select_all)}
        </button>
        <button type="button" on:click={selectInvertClick} title="Invert selection (I)">
            {@html toSvg(icons.ag_select_inverse)}
        </button>
        <button type="button" on:click={selectNeighborClick} title="Select neighbors (N)" disabled="{disableOnNoneSelected}">
            {@html toSvg(icons.ag_select_neighbors)}
        </button>
    </div>
    <div class="cy-toolbar-section">
        <button type="button" on:click={lockClick} title="Lock selected nodes in place (P)" disabled="{disableOnAllPinned}">
            {@html toSvg(icons.ag_lock)}
        </button>
        <button type="button" on:click={unlockClick} title="Unlock selected nodes (U)" disabled="{disableOnNonePinned}">
            {@html toSvg(icons.ag_unlock)}
        </button>
    </div>
</div>