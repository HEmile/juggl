<script lang="ts">
    export let icon;
    export let onClick;
    export let disabled = false;
    export let title;
</script>


<button type="button" class="juggl-button" on:click={onClick} aria-label={title} {disabled}>
    <svg style= "width:17px;height:17px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d={icon} />
    </svg>
</button>