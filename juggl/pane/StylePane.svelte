<script lang="ts">
    import {Juggl} from "../viz/visualization";
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
        plugin.activeGraphs().forEach(j => j.updateStylesheet());
    }
    let onChangeFilter = function() {
        if (viz) {
            viz.assignStyleGroups();
        }
    }
    let onChangeFilterGlobal = function () {
        plugin.saveData(settings);
        plugin.activeGraphs().forEach(j => j.assignStyleGroups());
    }

</script>
<div class="juggl-style-pane">
    <StyleGroups groups={localGroups} title="Local style groups" onChangeGroups={onChangeGroups} onChangeFilter={onChangeFilter} plugin={plugin} />
    <StyleGroups groups={globalGroups} title="Global style groups" onChangeGroups={onChangeGroupsGlobal} onChangeFilter={onChangeFilterGlobal} plugin={plugin} />
</div>