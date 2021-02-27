<script lang="ts">
    import SaveWorkspaceItem from "./SaveWorkspaceItem.svelte";
    export let onLoad;
    export let onSave;
    export let onDelete;
    export let savedGraphs: string[];
    let saveName = '';
    let _onSave = async (s: string) => {
        await onSave(s);
        // Ensures svelte reacts.
        savedGraphs = savedGraphs;
    }
    let _onDelete = async(s: string) =>  {
        await onDelete(s);
        savedGraphs = savedGraphs;
    }
    let filterInput = (event: KeyboardEvent)=> {
        if(event.key === '/') {
            event.preventDefault();
            return false;
        }
        return true;
    }
</script>
<div class="modal-content">
    <input class="list-item-part mod-extended" type="text" placeholder="Save current graph as..." bind:value={saveName}
    on:keydown={filterInput} />
    <button class="list-item-part" on:click={_onSave(saveName)}>Save</button>
</div>
<hr>
<div>
    {#each savedGraphs as graphName}
        <SaveWorkspaceItem name={graphName} onClick={onLoad} onDelete={_onDelete}>
        </SaveWorkspaceItem>
    {/each}
</div>