<script lang="ts">
    import SaveWorkspaceItem from "./SaveWorkspaceItem.svelte";
    export let onLoad;
    export let onSave;
    export let onDelete;
    export let savedGraphs: string[];
    let saveName = '';
</script>
<div class="modal-content">
    <input class="list-item-part mod-extended" type="text" placeholder="Save current graph as..." bind:value={saveName}/>
    <button class="list-item-part" on:click={onSave(saveName)}>Save</button>
</div>
<hr>
<div>
    {#each savedGraphs as graphName}
        <SaveWorkspaceItem name={graphName} onClick={onLoad} onDelete={onDelete}>
        </SaveWorkspaceItem>
    {/each}
</div>