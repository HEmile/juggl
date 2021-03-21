<script lang="ts">
    import {FileSystemAdapter} from "obsidian";
    import {STYLESHEET_PATH, GraphStyleSheet, DEFAULT_USER_SHEET} from "../../viz/stylesheet";
    // import {promises as fs} from "fs";
    import type JugglPlugin from "../../main";

    export let plugin: JugglPlugin;
    let openGraphCSS = async function() {
        let fullPath = (plugin.vault.adapter as FileSystemAdapter).getFullPath(STYLESHEET_PATH);
        // Write a file, throw an error if it already exists (flag wx). Just catch that because it's fine.
        try {
            const shell = require('electron').shell;
            const {promises} = require("fs");
            await promises.writeFile(fullPath,
                DEFAULT_USER_SHEET,
                {flag: 'wx'}).catch(e => {
            });
            await shell.openPath(fullPath);
        }
        catch (e) {
            console.log("Couldn't open style.css. This is probably because we are on mobile.");
            console.log(e);
        }
    }

</script>

<h3>
    Appearance
</h3>
<p>
    You can style the graph with css. This is done in the .obsidian/juggl/style.css file.
    See <a href="https://publish.obsidian.md/semantic-obsidian/Node+styling">this page</a> for help with styling.
</p>

<button on:click={openGraphCSS}>
    Open style.css in default editor.
</button>