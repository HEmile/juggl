<script lang="ts">
    import {FileSystemAdapter} from "obsidian";
    import {STYLESHEET_PATH} from "../../stylesheet";

    export let vault;
    let openGraphCSS = function() {
        const shell = require('electron').shell;
        let fullPath = (vault.adapter as FileSystemAdapter).getFullPath(STYLESHEET_PATH);
        console.log(fullPath);
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