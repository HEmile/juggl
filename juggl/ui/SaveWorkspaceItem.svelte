<script lang="ts">
    export let name;
    export let onClick;
    export let onDelete;
</script>
<div class="list-item">
    <div class="list-item-part mod-extended">
        {name}
    </div>
    <button class="list-item-part" on:click={onClick(name)}>Load</button>
    <div class="list-item-part clickable-icon" aria-label="Delete graph" on:click={onDelete(name)}>
        <svg viewBox="0 0 100 100" width="14" height="14" class="cross">
            <path fill="currentColor" stroke="currentColor" d="M15.4,12.6l-2.9,2.9L47.1,50L12.6,84.6l2.9,2.9L50,52.9l34.6,34.6l2.9-2.9L52.9,50l34.6-34.6l-2.9-2.9L50,47.1L15.4,12.6z ">

            </path>
        </svg>
    </div>
</div>