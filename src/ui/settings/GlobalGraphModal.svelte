<script lang="ts">
    export let cancelCallback;
    export let continueCallback;
</script>

Warning: Juggl is not optimized for large graphs. We advise not to use the global graph if your vault
contains more than 250 notes to prevent Obsidian from freezing. <br />

<button class='mod-cta' on:click={cancelCallback}>Cancel</button>
<button class="mod-cta" on:click={continueCallback}>Understood, continue</button>