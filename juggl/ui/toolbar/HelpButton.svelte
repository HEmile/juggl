<script lang="ts">
    import ToolbarButton from "./ToolbarButton.svelte";
    import {icons} from "../icons";
    import {Workspace} from "obsidian";
    import {JugglHelpView} from "../help-view";
    export let workspace: Workspace;
    let openHelp = function() {
        let leaf = workspace.getLeaf(true);
        let view = new JugglHelpView(leaf);
        leaf.open(view);
    }
</script>

<ToolbarButton icon={icons.ag_help} title="Help" onClick={openHelp} />