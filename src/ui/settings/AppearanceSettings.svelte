<script lang="ts">
    import {FileSystemAdapter} from "obsidian";
    import {STYLESHEET_PATH, GraphStyleSheet, DEFAULT_USER_SHEET} from "../../viz/stylesheet";
    // import {promises as fs} from "fs";
    import type JugglPlugin from "../../../main";

    export let plugin: JugglPlugin;
    let stylesheetPath = STYLESHEET_PATH(plugin.vault);
    let openGraphCSS = async function() {
        let fullPath = (plugin.vault.adapter as FileSystemAdapter).getFullPath(stylesheetPath);
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
            console.log("Couldn't open graph.css. This is probably because we are on mobile.");
            console.log(e);
        }
    }

</script>

<h3>
    Appearance
</h3>
<p>
    You can style the graph with css. This is done in the {stylesheetPath} file.
    See <a href="https://juggl.io/features/styling/css-styling.html">this page</a> for help with styling.
</p>

<button on:click={openGraphCSS}>
    Open graph.css in default editor.
</button>
