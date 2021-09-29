---
aliases: []
image: files/bloom_screenshot.jpg
---

An example of node styling for [[Neo4j Graph View Plugin]] is provided at [[Semantic Obsidian edge styling]].

Styling of edges is done in .json format. The first key determines what types of links to apply this style to. 
For instance, `{"hasTopic":{"color":"yellow"}}` would color all edge with type `hasTopic` yellow. 

## Special types
- Use `{"defaultStyle": {}}` for the default styling of edges
- Use`{"inline":{} }` for the styling of untyped links

See [this link](https://visjs.github.io/vis-network/docs/network/edges.html)for all options for styling edges.

--- 
#howto
- hasTopic [[Neo4j Graph View Plugin]]
- author [[Emile van Krieken]]