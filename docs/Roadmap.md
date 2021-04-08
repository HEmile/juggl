---
aliases: []
---


# Juggl
## First release
The [[Style Pane]] will be made available in the next test release.

## Planned

### [[Link Types]]
Add better support for creating and maintaining link types. Also provide new syntax for inline link types and properties on links. A discussion on syntax is in [[Link Types]].
- Inline typed links
- Properties on links
- Preview typed links using templates
- Autocomplete typed links

### [[Juggl API]]
It is easy using [[Cytoscape.js]] to create an API for other plugin developers to use, to interact with [[Juggl]]. This could allow extending the graph view with eg automatically adding data from external sources, such as citation graphs, or with a different syntax for creating graphs. ^82c7c4

### Minor
- Preview movie files using thumbnails
- Add external (Markdown) links to the graph. Clicking on that node opens the link in your browser
- Size individual notes using YAML metadata

## Ideas to discuss
### Outline in compound nodes
The outline of a note is essentially a tree. As it is completely hierarchical wrt the node representing the note, it can be nicely rendered and collapsed using compound nodes, like in

![](https://cdn.discordapp.com/attachments/794501737062203422/798921299404652574/JfMR9BuCHr.gif)__



--- 
#development
- hasTopic [[Semantic Obsidian]], [[Juggl]]
- author [[Emile van Krieken]]	