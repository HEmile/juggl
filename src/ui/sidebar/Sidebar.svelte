<script lang="ts">
    import type {Juggl} from '../../viz/visualization';
   export let viz: Juggl;
   let hidden = true;

</script>
<div class="juggl-sidebar" style="resize: {hidden ? 'none' : 'horizontal'}; overflow: auto;">
    {#if hidden}
        <div class="workspace-ribbon side-dock-ribbon mod-right is-collapsed">
            <div class="workspace-ribbon-collapse-btn" aria-label="Expand" aria-label-position="left">
                <svg viewBox="0 0 100 100" width="16" height="16" class="right-arrow">
                    <path fill="currentColor" stroke="currentColor" d="M30,8c-0.8,0-1.5,0.5-1.9,1.2c-0.3,0.8-0.1,1.6,0.5,2.2L67.2,50L28.6,88.6c-0.5,0.5-0.7,1.3-0.5,1.9 c0.2,0.7,0.7,1.2,1.4,1.4c0.7,0.2,1.4,0,1.9-0.5l40-40c0.8-0.8,0.8-2,0-2.8l-40-40C31,8.2,30.5,8,30,8z">
                    </path>
                </svg>
            </div>
        </div>

    {:else}

    {/if}
</div>