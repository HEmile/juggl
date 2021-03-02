<script lang="ts">
    import {NodeCollection} from "cytoscape";

    export let nodes: NodeCollection;
</script>

{#each nodes.sort((a, b) => a.data("name").localeCompare(b.data("name"))) as v}
    <div class="tree-item">
        <div class="tree-item-self is-clickable">
            <div class="tree-item-inner juggl-list-text">
                {v.data("name")}
            </div>
        </div>
    </div>
{/each}