---
aliases: [layout]
---

[[Juggl]] contains (currently) four different layout options. You can choose a layout from the buttons on the left of the toolbar:  
![[Pasted image 20210403151424.png|400]]

In order, these are the following layouts:

- **Force directed layout**: A standard force directed layout, where nodes push each other away and links try to keep nodes together. Juggl uses the [Cola layout](https://github.com/cytoscape/cytoscape.js-cola) by default, but this can sometimes give weird vertical results. A more standard approach that is [like Obsidians graph](https://github.com/shichuanpo/cytoscape.js-d3-force) can be used from the settings under **Extensions > Force Directed Layout**. ![[Pasted image 20210408165620.png]]
- **Concentric**: Puts all nodes in a circle, with the 'focused nodes' in the center. The focused nodes are the nodes around which we use the local mode, or expanded nodes. ![[Pasted image 20210408165722.png]]
- **Grid**: A standard grid-like layout, similar to Roam Research. ![[Pasted image 20210408165744.png]]
- **Hierarchical**: Puts the notes in a hierarchy over links. This uses the [Dagre algorithm](https://github.com/cytoscape/cytoscape.js-dagre). ![[Pasted image 20210408165833.png]]


--- 
#feature
- author [[Emile van Krieken]]