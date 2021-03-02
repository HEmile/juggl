<script lang="ts">
    import {Juggl} from "../viz/visualization";
    import {NodeCollection} from "cytoscape";
    import cytoscape from "cytoscape";
    import {CLASS_HARD_FILTERED} from "../constants";
    import NodesList from "./NodesList.svelte";

    let viz: Juggl = null;
    let visible: NodeCollection = cytoscape().collection();
    let hidden: NodeCollection = cytoscape().collection();
    export const setViz = function (juggl: Juggl) {
        if (!juggl) {
            viz = null;
            visible = cytoscape().collection();
            hidden = cytoscape().collection();
            return;
        }
        viz = juggl;
        visible = viz.viz.nodes(":visible");
        hidden = viz.viz.nodes(`.${CLASS_HARD_FILTERED}`);
    }
    // console.log("Made me a setviz");
</script>

<div class="juggl-list-header">
    Nodes in graph
</div>
<NodesList nodes={visible} />

<div class="juggl-list-header">
    Nodes hidden
</div>
<NodesList nodes={hidden} />