<script lang="ts">
    import {Icon, SHAPES, StyleGroup} from "../viz/stylesheet";
    import {IconModal} from "./icon-modal";
    import JugglPlugin from "../main";
    import {emptyStyleGroup} from "../settings";
    import {icons} from "../ui/icons";

    export let groups: StyleGroup[];
    export let title: string;//
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
        onChangeFilter();
        onChangeGroups();
    }
    let onIconButton = function(group: StyleGroup) {
        let callback = function(icon: Icon) {
            group.icon = icon;
            onChangeGroups();
            groups = groups;
        }
        let iconModal = new IconModal(plugin.app, callback, group.icon.color);
        iconModal.open();
    }
    let showGroup = function(group: StyleGroup, show: boolean) {
        group.showInPane = show;
        groups = groups;
    }

    let changeShow = function(group: StyleGroup) {
        group.show = !group.show;
        onChangeGroups();
        groups = groups;
    }

</script>

<div class="juggl-list-header">
    {title}
</div>
<div class="juggl-style-group-container">
    {#each groups as group}
        {#if group.showInPane}
        <div class="juggl-style-group">
            <div class="juggl-style-pane-left">
            <div class="clickable-icon" aria-label="Hide group options" on:click={showGroup(group, false)} flex-basis="100%" >
                <svg viewBox="0 0 100 100" width="8" height="8" class="right-triangle">
                    <path fill="currentColor" stroke="currentColor"
                          d="M94.9,20.8c-1.4-2.5-4.1-4.1-7.1-4.1H12.2c-3,0-5.7,1.6-7.1,4.1c-1.3,2.4-1.2,5.2,0.2,7.6L43.1,88c1.5,2.3,4,3.7,6.9,3.7 s5.4-1.4,6.9-3.7l37.8-59.6C96.1,26,96.2,23.2,94.9,20.8L94.9,20.8z">
                    </path>
                </svg>
            </div>
            <div class="clickable-icon" aria-label={group.show ? "Hide group" : "Show group"} on:click={changeShow(group)} flex-basis="100%" >
                <svg viewBox="0 0 24 24" width="16" height="16" class="right-triangle">
                    <path fill="currentColor" stroke="currentColor"
                          d={group.show ? icons.ag_unhide : icons.ag_hide}>
                    </path>
                </svg>
            </div>
            </div>
            <input type="text" placeholder="Enter filter..." bind:value={group.filter} on:change={onChangeFilter}/>
            <div class="clickable-icon" aria-label="Delete group" on:click={onDeleteGroup(group)} flex-basis="100%" >
                <svg viewBox="0 0 100 100" width="16" height="16" class="cross">
                    <path fill="currentColor" stroke="currentColor"
                          d="M15.4,12.6l-2.9,2.9L47.1,50L12.6,84.6l2.9,2.9L50,52.9l34.6,34.6l2.9-2.9L52.9,50l34.6-34.6l-2.9-2.9L50,47.1L15.4,12.6z ">
                    </path>
                </svg>
            </div>
            <div class="break"></div>
            <div class="juggl-style-pane-left">
                <input type="color" aria-label="Click to change color" bind:value={group.color} flex-basis="100%" on:change={onChangeGroups}/>
            </div>
            <select bind:value={group.shape} class="dropdown" on:blur={onChangeGroups}>
                {#each SHAPES as shape}
                    <option value={shape}>{shape}</option>
                {/each}
            </select>
            <div class="break"></div>
            <div class="juggl-style-pane-left">
                {#if group.icon.path}
                    <input type="color" aria-label="Click to change icon color" bind:value={group.icon.color} flex-basis="100%" on:change={onChangeGroups}/>
                {/if}
            </div>
            <button class="juggl-icon-button" on:click={onIconButton(group)}>
                {#if group.icon.path}
                    <svg style= "width:24px;height:24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentcolor" d={group.icon.path} />
                    </svg>
                {:else}
                    {group.icon.name}
                {/if}
            </button>
            <div class="break"></div>
            <div class="juggl-style-pane-left">
                     {Math.round(group.size* 100) / 100}
            </div>
            <input class="slider" type="range" min="0.01" max="10" step="any" bind:value={group.size} aria-label="Size" on:change={onChangeGroups} />
        </div>
        {:else}
            <div class="juggl-style-group-hidden">
                <div class="clickable-icon" style="display: inline" aria-label="Show group options" on:click={showGroup(group, true)} >
                    <svg viewBox="0 0 100 100" width="8" height="8" class="right-triangle">
                        <path fill="currentColor" stroke="currentColor" transform="rotate(270 50 50)"
                              d="M94.9,20.8c-1.4-2.5-4.1-4.1-7.1-4.1H12.2c-3,0-5.7,1.6-7.1,4.1c-1.3,2.4-1.2,5.2,0.2,7.6L43.1,88c1.5,2.3,4,3.7,6.9,3.7 s5.4-1.4,6.9-3.7l37.8-59.6C96.1,26,96.2,23.2,94.9,20.8L94.9,20.8z">
                        </path>
                    </svg>
                </div>
                {group.filter}
            </div>
            <br />
        {/if}
    {/each}
    <div class="graph-color-button-container" on:click={onNewGroup}>
        <button class="mod-cta">
            New group
        </button>
    </div>
</div>
