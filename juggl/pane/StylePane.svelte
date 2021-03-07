<script lang="ts">
    import {Juggl} from "../viz/visualization";
    import type {IJugglPluginSettings} from "../settings";
    import StyleGroups from "./StyleGroups.svelte";
    import JugglPlugin from "../main";

    export let viz: Juggl;
    export let plugin: JugglPlugin;
    let settings = plugin.settings;

    export const setViz = function (_viz: Juggl) {
        viz = _viz;
        if (viz) {
            localGroups = viz.settings.styleGroups;
        } else {
            localGroups = [];
        }
    }

    let localGroups = [];
    let globalGroups = settings.globalStyleGroups;
    let onChangeGroups = function() {
        if (viz) {
            viz.updateStylesheet()
        }
    }
    let onChangeGroupsGlobal = function() {
        plugin.saveData(settings);
        onChangeGroups();
    }
    let onChangeFilter = function() {
        if (viz) {
            console.log("on change filter!");
            viz.assignStyleGroups();
        }
    }
    let onChangeFilterGlobal = function () {
        plugin.saveData(settings);
        onChangeFilter();
    }

</script>
<div class="juggl-style-pane">
    <StyleGroups groups={localGroups} title="Local style groups" onChangeGroups={onChangeGroups} onChangeFilter={onChangeFilter} />
    <StyleGroups groups={globalGroups} title="Global style groups" onChangeGroups={onChangeGroupsGlobal} onChangeFilter={onChangeFilterGlobal} />
</div>