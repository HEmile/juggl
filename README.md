
<p align="left">
    <a href="https://ko-fi.com/Emile" title="Donate to this project using Buy Me A Coffee"><img src="https://img.shields.io/badge/buy%20me%20a%20coffee-donate-yellow.svg" alt="Buy Me A Coffee donate button" width="160"/></a>
    <a href="https://github.com/HEmile/juggl/releases">
        <img src="https://img.shields.io/github/downloads/HEmile/juggl/total.svg"
            alt="Downloads" width="110"></a> 
    <a href="https://github.com/HEmile/juggl/releases">
        <img src="https://img.shields.io/github/v/release/HEmile/juggl"
            alt="Github latest release" width="100"></a>
   <a href="https://juggl.io">
        <img src="https://img.shields.io/badge/docs-Obsidian-blue"
            alt="Documentation" width="100"></a>
    <a href="https://discord.gg/sAmSGpaPgM">
        <img src="https://img.shields.io/discord/794500624163143720?logo=discord"
            alt="chat on Discord" width="120"></a>
</p>

## Juggl 
Juggl is a completely interactive, stylable and expandable graph view for [Obsidian](https://obsidian.md). It is designed as an advanced 'local' graph view called the 'workspace', where you can juggle all your thoughts with ease: By navigating your vault through a beautiful graph!

For example, you can select what parts of the graph to expand, to make sure there is never too much information on the screen. You will have complete control over the style of your graph using the powerful [Cytoscape.js library](https://js.cytoscape.org): Juggl has a useful styling pane nodes colors, shapes, sizes, and icons. This helps you get an immediate overview over what the content of each node is.

![](https://raw.githubusercontent.com/HEmile/juggl/main/juggl/resources/juggl_trailer.gif)

## Features
Juggl has many features unique to its graph view compared to the Obsidian graph view:
- Complete control over the style of your graph using [CSS](https://juggl.io/Features/Styling/CSS+Styling), [YAML](https://juggl.io/Features/Styling/YAML+Styling) and the [Style Pane](https://juggl.io/Features/Styling/Style+Pane) .
  - Include images!
- A [Workspace mode](https://juggl.io/Features/Workspace+mode/Workspace+mode) that lets you build your graph with all nodes that are relevant to your current project
  - Selectively browse and hide nodes, and pin their location so you never lose them
  - Write new ideas and see your graph evolve
  - Save your graph and continue working on it later
- 4 different [layouts](https://juggl.io/Features/Layouts) to get unique insights
- A [code fence](https://juggl.io/Features/Juggl+code+fence) that displays the graph within Obsidian notes
- Link type support to label edges
- No need to install Python or Neo4j, unlike Neo4j Graph View
- Extendable through other plugins
- Works on mobile!

## Getting started 
You can open Juggl from the 'more options' menu on files:
![](https://raw.githubusercontent.com/HEmile/juggl/main/juggl/resources/open_juggl.gif)

You can interact with the graph with many of the same options as in Obsidian. For further documentation, check out [juggl.io](https://juggl.io/), where you can find information on for example [styling](https://juggl.io/Features/Styling/Styling) or the syntax of the [code fence](https://juggl.io/Features/Juggl+code+fence). 
You can also open the help vault with this button in Juggl:
![](https://raw.githubusercontent.com/HEmile/juggl/main/juggl/resources/juggl_help.gif)


## Extending Juggl
Juggl is completely open source and has an API available for creating Obsidian plugins that extend or use Juggl. See https://github.com/HEmile/juggl-api . You will have complete control over the internals of [Cytoscape.js](https://js.cytoscape.org), which is an extremely powerful graph visualization library! 
