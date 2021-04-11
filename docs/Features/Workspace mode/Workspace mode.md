---
aliases: []
---

The Workspace Mode is the unique graph interactivity mode implemented in [[Juggl]]. It gives you full control over navigation in the graph, over what nodes are displayed and how nodes are laid out. Furthermore, you can save and load [[Workspace graph]]s to continue working on a graph.

As an introduction, the design of the Workspace Mode can be compared to: 
1. A 'desktop' of ideas, where everything you're currently working on is spatially laid out.
2. A 'brain' of visual concepts, that you can search through in a nonlinear fashion: Expand concepts and see where they lead, and find new connections between ideas.

# Getting Started
You can open the Workspace Mode by starting from a note. The easiest is using the 'file options' menu just like the local graph. This can be found in the hamburger menu above a note: 

![[Pasted image 20210402154645.png|400]]

With the default setting this opens the [[Local mode]]. You can activate the Workspace mode by clicking on this button in the toolbar: 

![[Pasted image 20210402155246.png]]

You can set Juggl to always open in the Workspace mode in the settings under **Extensions > Default mode**. 

## Basic interaction
In the workspace mode, you can drag around the screen to move it, and also drag nodes around to move them, like in other modes. However, the workspace mode contains additional interaction options.

While holding shift, you can click and drag around the screen to select a group of nodes:
![[selectdrag.mp4]]

Selected nodes can be interacted with through the [[#Toolbar]]. 

To interact with a single node, click and hold on that node to open the **radial context menu**: 
![[Screen Recording 2021-04-03 at 13.58.20.mp4]]

**Open file**: 
![[Pasted image 20210403140754.png|200]]
This opens the select file in an existing or new leaf. Clicking on a node also opens the file.

**Expand or Collapse**
![[Pasted image 20210403141344.png|200]]

Expanding and collapsing is a central concept of the Workspace mode. When you **expand** a node, all its neighbors are added to the graph.  When you **collapse** an expanded node, its neighbors are removed again. There are some subtleties here, which we will discuss later. 
Expanding nodes is the easiest way to explore your graph! You can also expand by **double-clicking** a node, or by pressing the **E** button. 

**Locking and unlocking**
![[Pasted image 20210403142046.png|200]]
With this button, you can lock and unlock a node into one spot. This means it won't move using the layout options. This can be useful when you want to manually choose the positions of some nodes to ensure they're always in the same position.


**Filter node**
![[Pasted image 20210403144754.png|200]]

Filters the node from the view. You can add the node back again using the [[Nodes Pane]].

**Fit view**
![[Pasted image 20210403143207.png|200]]

Focus on the selected nodes and its neighbors, and zoom the view to fit on its neighborhood.
## Toolbar
The toolbar is the set of buttons on the top of the Juggl view, with the following functions: 
![[Pasted image 20210402162157.png]]

These functions will apply to the full selection of nodes selected using shift-dragging! For instance, to hide a group of nodes, you would do: 

![[Screen Recording 2021-04-03 at 14.59.13.mp4]]

The first four buttons allow you to choose a [[Layouts|layout]]. To the right of that, you have the 'fit view' button which centers the view on the graph, a button to return to the [[Local mode]], and a button that navigates to the help vault (that you are reading right now). 

### Saving and loading
![[Screenshot 2021-04-03 at 15.01.44.png|200]]

The highlighted button will let you save and load [[Workspace graph]]s. Click the button to open the Manage Workspace Graphs UI: 

![[Pasted image 20210403150726.png]]

This UI functions just like the [Manage Workspaces UI in Obsidian](https://help.obsidian.md/Plugins/Workspaces).

--- 
#howto #feature
- author [[Emile van Krieken]]
- hasTopic [[Juggl]]