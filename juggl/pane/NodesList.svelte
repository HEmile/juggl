<script lang="ts">
    import {NodeCollection, NodeSingular} from "cytoscape";

    export let name: string;
    export let nodes: NodeCollection;
    export let onClickText;
    export let onClickButton;
    export let icon = null;
    export let icon_tooltip = null;
    export let ctxmenu;
    let displayList = true;

    let setDisplayList = function() {
        displayList = !displayList;
    }
</script>

<div class="juggl-list-header" on:click={setDisplayList}>
    {name}
</div>
{#if displayList}
    {#each nodes.sort((a, b) => a.data("name").localeCompare(b.data("name"))) as v}
        <div class="tree-item">
            <div class="tree-item-self is-clickable">
                <div class="tree-item-inner juggl-list-text" on:click={(e) => onClickText(v, e)}
                     on:contextmenu={(e) => ctxmenu(v, e)}
                     style="color: {v.style('background-color')}">
                    {v.data("name")}
                </div>
                {#if icon}
                    <button type="button" class="juggl-button juggl-button-pane" on:click={onClickButton(v)} aria-label={icon_tooltip} >
                        <svg style= "width:14px;height:14px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d={icon} />
                        </svg>
                    </button>
                {/if}
            </div>
        </div>
    {/each}
{/if}