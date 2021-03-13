<script lang="ts">
    import {Icon, SHAPES, StyleGroup} from "../viz/stylesheet";
    import {IconModal} from "./icon-modal";
    import JugglPlugin from "../main";
    import {emptyStyleGroup} from "../settings";
    export let groups: StyleGroup[];
    export let title: string;
    export let onChangeFilter;
    export let onChangeGroups;
    export let plugin: JugglPlugin;
    let onNewGroup = function() {
        groups.push(emptyStyleGroup);
        groups = groups;
        onChangeGroups();
    }
    let onDeleteGroup = function(group: StyleGroup) {
        groups.remove(group);
        groups = groups;
        onChangeGroups();
    }
    let onIconButton = function(group: StyleGroup) {
        let callback = function(icon: Icon) {
            group.icon = icon;
            onChangeGroups();
            groups = groups;
        }
        let iconModal = new IconModal(plugin.app, callback);
        iconModal.open();
    }

</script>

<div class="juggl-list-header">
    {title}
</div>
<div class="juggl-style-group-container">
    {#each groups as group}
        <div class="juggl-style-group">
            <input type="text" placeholder="Enter filter..." bind:value={group.filter} on:change={onChangeFilter}/>
            <div class="clickable-icon" aria-label="Delete group" on:click={onDeleteGroup(group)} flex-basis="100%" >
                <svg viewBox="0 0 100 100" width="16" height="16" class="cross">
                    <path fill="currentColor" stroke="currentColor"
                          d="M15.4,12.6l-2.9,2.9L47.1,50L12.6,84.6l2.9,2.9L50,52.9l34.6,34.6l2.9-2.9L52.9,50l34.6-34.6l-2.9-2.9L50,47.1L15.4,12.6z ">
                    </path>
                </svg>
            </div>
            <div class="break"></div>
            <select bind:value={group.shape} class="dropdown" on:blur={onChangeGroups}>
                {#each SHAPES as shape}
                    <option value={shape}>{shape}</option>
                {/each}
            </select>
            <input type="color" aria-label="Click to change color" bind:value={group.color} flex-basis="100%" on:change={onChangeGroups}/>
            <div class="break"></div>
            <button class="juggl-icon-button" on:click={onIconButton(group)}>
                {#if group.icon.path}
                    <svg style= "width:24px;height:24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentcolor" d={group.icon.path} />
                    </svg>
                {:else}
                    {group.icon.name}
                {/if}

            </button>
        </div>
    {/each}
    <div class="graph-color-button-container" on:click={onNewGroup}>
        <button class="mod-cta">
            New group
        </button>
    </div>
</div>
