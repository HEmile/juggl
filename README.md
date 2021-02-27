
<p align="left">
    <a href="https://github.com/HEmile/obsidian-neo4j-graph-view/releases">
        <img src="https://img.shields.io/github/downloads/HEmile/obsidian-neo4j-graph-view/total.svg"
            alt="Downloads" width="110"></a> 
    <a href="https://github.com/HEmile/obsidian-neo4j-graph-view/releases">
        <img src="https://img.shields.io/github/v/release/HEmile/obsidian-neo4j-graph-view"
            alt="Github latest release" width="100"></a>
   <a href="https://publish.obsidian.md/semantic-obsidian/Neo4j+Graph+View+Plugin">
        <img src="https://img.shields.io/badge/docs-Obsidian-blue"
            alt="Documentation" width="100"></a>
    <a href="https://discord.gg/sAmSGpaPgM">
        <img src="https://img.shields.io/discord/794500624163143720?logo=discord"
            alt="chat on Discord" width="120"></a>
</p>

## Juggl 

This branch is for the complete rewrite of the Neo4j Graph View Plugin, which will be called 'Juggl'. 
If you would like to help with testing, please join the Discord server  https://discord.gg/sAmSGpaPgM

Documentation of this version is of high priority, and will be done soon!

Adds a completely interactive, stylable and expandable graph view to Obsidian. 
It is designed as an advanced 'local' graph view called the 'workspace', where you can juggle all your thoughts with ease.
The goal of Juggl is to help you be productive by turning Obsidian into an app that's primarily navigated through a graph!

For example, you can select what parts of the graph to expand, to make sure there is never too much information on the screen.
Furthermore, because it uses the powerful Cytoscape.js library, you have complete control over styling your graph.
You can use rules to style nodes and edges with colors, shapes, sizes, and even images.
This helps you get an immediate overview over what the content of each node is.


Some features:
- Use CSS, YAML and styling groups for complete control with styling your graph.
- Workspace mode that helps you build up your graph with all nodes that are relevant to your current project.
  - Selectively browse and hide nodes, and pin their location so you never lose where they are
  - Save your graph so you can continue working on it later!
- 4 different layouts to get different kinds of insights 
- A code fence that displays the graph within Obsidian notes 
- Juggl is full of advanced features that will allow you to make 
- Unlike Neo4j Graph View, there's no need to install Python or Neo4j!


A [Roadmap](https://publish.obsidian.md/semantic-obsidian/Roadmap) with planned features is also available.

### Semantics
The plugin collects all notes with extension .md in the input directory (default: `markdown/`). Each note is interpreted as follows:
- Interprets tags as CSS classes
- Interprets YAML frontmatter as CSS attributes
- Interprets wikilinks as links with link type `inline`, and adds content
- Lines of the format `"- linkType [[note 1]], [[note 2|alias]]"` creates links with type `linkType` from the current note to `note 1` and `note 2`.
- The name of the note is stored in the attribute `name`
- The content of the note (everything except YAML frontmatter and typed links) is stored in the attribute `content`
- Links to notes that do not exist yet are created without any types.

