---
aliases: [code fence, code block]
---

![[code_fence.gif|400]]

You can use 'code fences' to embed [[Juggl]] graphs inside notes. You can also do this using the [[Breadcrumbs]] plugin with [[Breadcrumbs code blocks]]. These code blocks have tonnes of (shared) options. See [[#Code block options]] for a full overview.

For example, the following code block:

~~~
```juggl
local: Juggl code fence
```
~~~

will display when using Juggl as:

![[Pasted image 20210413150208.png|300]]

The code fence is in the familiar YAML syntax.

## Creating a Juggl code block
The code fence requires one of currently two **modes**. You can use either `local` for the graph around a node... (To write!)

## Code block options
Add these fields as options in YAML syntax. The default value is in between parentheses.
- `layout` (force-directed). The layout used for the graph. Choose from `force-directed, circle, grid, hierarchy`
- `fdgdLayout` (cola): The algorithm to use for force-directed layouts. Choose from `cola, d3-force`
- `filter` (''): A [[Filtering|Filter]] to use on the graph
- `width` (100%): The width of the canvas created by the code block
- `height` (750px): The height of the canvas created by the code block
- `limit` (250): The maximum amount of nodes to display in the visualization
- `metaKeyHover` (true): Whether to only show hover previews when the meta key (ctrl/cmd) is down
- `navigator` (true): Whether to show the 'mini-map' in the bottom-right corner
- `toolbar` (true): Whether to show the toolbar on top
- `zoomSpeed` (1): How quickly to zoom in and out
- `autoAddNodes` (false): Whether to automatically add the corresponding node when you switch to a note
- `autoExpand` (false): 
- `autoZoom` (false): Whether to automatically zoom such that the whole graph is visible. This is done when a layout is finished
- `expandInitial`: (false): Whether to automatically expand the sets of nodes from the query. Warning: This can create very big graphs!

--- 
#feature 
- author [[Emile van Krieken]]