---
aliases: []
---
## Getting started
### Opening the Graph View
On an open note, click the three dots in the right-upper corner, and select: "Open Neo4j Graph View":

![[Screen Recording 2021-01-02 at 15.32.58.mp4]]

You can also use the command "Neo4j Graph View: Open local graph of note". You can run commands using ctrl/cmd+p. Alternatively, you can bind this command to a hotkey in the Obsidian settings.

![[Pasted image 20210101144050.png]]

Finally, you can right-click on a file and open the graph from there:
![[Pasted image 20210102141546.png|300]]

The local graph of a node shows the opened note and all other notes that are linked to it (including 'backlinks'). It will show also show images in your notes within the graph. I'll work on doing a preview of videos as well.

Hovering over a node or a relationship gives a preview of the corresponding note and context of the relation.
![[Screen Recording 2021-01-02 at 15.38.11.mp4]]
### Interacting with the graph
Click on a node to open it in Obsidian:

![[Screen Recording 2021-01-02 at 15.01.02.mp4|300]]

Double-click on a node to show ("expand") its neighbors. Neighbors are the outgoing links and the backlinks. 

![[Screen Recording 2021-01-02 at 15.05.43.mp4]]

Hold shift, then click and drag in the graph view to select nodes.
![[Screen Recording 2021-01-02 at 15.09.51.mp4]]

Right-click in the graph view to open the context menu. This can be used to open the corresponding file in several places.

![[Screen Recording 2021-01-02 at 15.14.06.mp4]]

The context menu has some options to manipulate what you see in the graph. One very useful thing is to hide some nodes that clutter up the view. This is done by shift-draggin to select the nodes to hide, then using the context menu and click on "Hide selection". You can also use the "H" button to hide the selected nodes.

![[Screen Recording 2021-01-02 at 15.24.43.mp4]]

The other options are: 
- 
   - **Expand selection** (hotkey E):  "Expand" the neighbors of all selected nodes. This will add all nodes related to the selected nodes.
   - **Invert selection** (hotkey I): Select all the nodes that are not currently selected.
   - **Select all** (hotkey A): Select all nodes.

The graph view will also add nodes corresponding to files you visit in Obsidian, to create a "path" of nodes you visited.

![[Screen Recording 2021-01-02 at 15.43.17.mp4]]

The graph view will also automatically update with changes you make in the note.

![[Screen Recording 2021-01-02 at 14.19.42.mp4]]

The settings contains several options, such as coloring based on folders and a hierarchical layout. 

## Advanced use
### Styling
You can style  both nodes and edges, as shown in the above videos. See [[Node styling]] and [[Edge styling]] for guidance on how to do this. 
### Cypher Querying
You can do very complicated querying using the [[Cypher]] query language. Create code blocks with language `cypher`. In this code block, create your Cypher query. Then, when the cursor is on this code block, use the Obsidian command 'Neo4j Graph View: Execute Cypher query'. Example: 

![[cypher_querying.png]]

[[Contributing]] 

--- 
#howto
- hasTopic [[Neo4j Graph View Plugin]]
- author [[Emile van Krieken]]