<script lang="ts">
    import {FileSystemAdapter} from "obsidian";
    import {STYLESHEET_PATH, GraphStyleSheet} from "../../viz/stylesheet";
    import {promises as fs} from "fs";
    import type AdvancedGraphPlugin from "../../main";

    export let plugin: AdvancedGraphPlugin;
    let openGraphCSS = async function() {
        const shell = require('electron').shell;
        let fullPath = (plugin.vault.adapter as FileSystemAdapter).getFullPath(STYLESHEET_PATH);
        // Write a file, throw an error if it already exists (flag wx). Just catch that because it's fine.
        await fs.writeFile(fullPath,
            new GraphStyleSheet(plugin).genStyleSheet(),
            { flag: 'wx' }).catch(e => {});
        shell.openPath(fullPath);
    }

</script>

<h3>
    Appearance
</h3>
<p>
    You can fully style the graph with .css. This is done through the graph.css file.
    See <a href="https://publish.obsidian.md/semantic-obsidian/Node+styling">this page</a> for help with styling.
</p>

<button on:click={openGraphCSS}>
    Open graph.css in default editor.
</button>