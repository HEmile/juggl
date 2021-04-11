---
aliases: []
image: https://raw.githubusercontent.com/HEmile/obsidian-neo4j-graph-view/main/neo4j-graph-view/resources/styled_screenshot.png
---

An example of node styling for this vault is provided at [[Semantic Obsidian node styling]].

Styling of nodes is done in .json format. 
The first key determines what tags or folders to apply this style to. For instance, `{"exampleTag":{"color":"yellow"}}` would color all notes with \#exampleTag yellow. You can style nodes using images in your vault with `{"shape": "image", "image": "http://localhost:3000/path/to/image"}.`

When color-coding is set to Folders, use the path to the folder for this key. For instance, if you have a folder called `dailies`, use `{"dailies": {}}`. Use `{"/": {}}` for the root folder. 


See [this link](https://visjs.github.io/vis-network/docs/network/nodes.html) for all options for styling the nodes. 

Join the [[Discord]] for additional help (and to show off your configuration!). 

## Special types
- Use `{"defaultStyle": {}}` for the default styling of nodes
- Use `{"image": {}}` to style images
- Use `{"SMD_dangling": {}}` to style dangling notes (notes that don't have a real file, but are linked to)

--- 
#howto
- hasTopic [[Neo4j Graph View Plugin]]
- author [[Emile van Krieken]]