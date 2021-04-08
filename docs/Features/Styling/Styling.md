---
aliases: [style]
---

You can style the graph of [[Juggl]] in many ways. On this page you can find for each use case how best to use the styling options provided.

## Styling groups of nodes and edges
Styling groups of nodes can be done using the [[Style Pane]], which is easy but limited, and using [[CSS Styling|CSS]], which has a lot more options but is also harder to get started with. 

It is recommended to start with the Style Pane, but if you want to go all-in to the plugin, it can be worth it to learn CSS styling! 

## Styling individual nodes
The third option for styling is using the [[YAML Styling|YAML frontmatter]] of Obsidian notes. This allows for styling individual nodes. You can for example add an image in YAML that Juggl will show in the node to make it easily recognizable.

## Styling individual edges
Juggl does not yet support styling individual edges, but this will be possible in the future through the new implementationo [[Link Types]]. You can use [[CSS Styling|CSS]] to style based on simple link types, though!

## FAQ
### What priority does each styling option get?
In general, the idea is to make more specific styling options have higher priority. That is, in decreasing order of priority, we have [[YAML Styling|YAML]], local [[Style Pane|style groups]], global style groups, CSS and default styling.



--- 
#howto
- author [[Emile van Krieken]]