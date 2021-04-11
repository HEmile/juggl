---
aliases: [CSS]
---

For complete control over [[Styling]], you can use CSS. This has a somewhat higher learning curve, but is extremely powerful! It allows you to create rule-based styling so you can visually represent concepts or attributes in your vault. 

To use the CSS functionality, edit `.obsidian/juggl/style.css`. Edits in this file should automatically change the style of currently open graphs. 
You can also open this file from the Juggl settings:

![[Pasted image 20210410161051.png]]

This document acts as an overview of common and useful options for Juggl. For documentation on everything that's possible (_a lot!_), see the [Cytoscape.js styling documentation](https://js.cytoscape.org/#style).

We will first discuss how to [[#Selectors|select certain objects]], then discuss common [[#Properties|properties]] you might want to change, then finally show a couple of [[#Snippets|snippets]] to get started. 

# Selectors
[Selectors](https://www.w3schools.com/cssref/css_selectors.asp) are used to filter what objects to style. The two main 'elements' that can be targeted are `node` and `edge`.	
## Classes
Classes can be selected using `.class`. Available classes that are useful to style different nodes in Juggl are:
- `.tag-tagname`: Targets all nodes with the tag #tagname
- `.type-typename`: Targets all edges with the [[Link Types|type]] 'typename'
- Any class in the `cssclass` property in your [[YAML Styling|YAML]] frontmatter is also available on that node.
- `.dangling`: Targets dangling nodes (nodes that aren't created as a file)
- `.image`: Targets all nodes that are rendered as images. This is image files, but also notes that are styled with the `image` [[YAML Styling|YAML]] property. Similar for `.audio`, `.video` and `.pdf`.
- `.note`: Targets all nodes that represent `.md` files.
- `.global-3`: Targets nodes in the **fourth** global [[Style Pane|style group]](note: zero-based indexing!)
- `.local-5`: Targets nodes in the fifth local style group

There are also several classes to target nodes with a certain state:
- `:selected`: Targets selected nodes
- `.pinned`: Targets 'locked' nodes
- `.expanded`: Targets [[Workspace mode|expanded]] nodes
- `.hover`, `.unhover`: Targets hovered nodes
- `.active-node`: Targets currently active node (usually currently open note)
- `.connected-active-node`: Targets neighbours of active node
- `.inactive-node`: Targets nodes not in the neigbourhood of the active node
- `.filtered`: Targets nodes filtered using the [[Filtering|filter]] toolbar
- `.hard-filtered`: Targets nodes filtered using user interaction
- `.protected`: Internal class that targets nodes that cannot be automatically removed
- `:loop`: Targets edges that are self-loops (same source and target)

## Attributes
Attributes are values on nodes that you can use for styling. You can refer to these attributes using `data(attribute_name)`. You can also use them to create linear maps using `mapData(attribute_name, in_min, in_max, out_min, out_max);`. Attributes can also be used to select elements, see [this page](https://js.cytoscape.org/#selectors/data) for all options.


- Any [[YAML Styling|YAML]] property can be referenced by name. For example, if you have `cooking_time: 34` in your YAML frontmatter, you can use 
	```css
	node[cooking_time] {
		width: data(cooking_time);
	}
	``` 
	to scale the width of nodes by cooking time.
- `name`: The name of the node
- `path`: The path (relative to vault) of the file the node represents. This can be used to select based on folders:
	```css
	node[path ^= 'folder1/folder2/'] {
		background-color: red;
	}
	``` 
	This means: Select all nodes with paths that start with `folder1/folder2`, ie files in that folder.
- `content`: The content of the note. You can use this to search for some text, for instance: 
	```css
	node[content @*= 'juggl'] {
		background-color: red;
	}
	``` 
	This means: Select all notes that contain 'juggl', case insensitive.
- `degree`: The amount of edges connected to the node.
- `edgeCount`: When edges are merged (default), this is the total amount of edges of a certain type that are merged together. This is used by default to make lines thicker for merged edges that represent more links.
# Properties
Cytoscape.js provides many properties to target for styling, both for [nodes](https://js.cytoscape.org/#style/node-body) and [edges](https://js.cytoscape.org/#style/edge-line). 

## Nodes
Useful common properties are listed as following. See [this link](https://js.cytoscape.org/#style/node-body) for all options. There are _way_ more than listed here, so if you're looking for something specific, make sure to check out that link. 
- `width`, `height`: Change width and height, individually
- `shape`: Node shape, choose from the same options as in the [[Style Pane]].
- `background-color`: Color of the node
	- Check [this link](https://js.cytoscape.org/#style/node-body) for options with gradient-coloring
- `background-opacity`: Opacity of the node
- `border-width`, `border-color`, `border-opacity`: Style the border of the node
	- `border-style`: Choose from `solid, dotted, dashed, double`
- `background-image`: URL to the background image. See [this link](https://js.cytoscape.org/#style/background-image) and [[YAML Styling]] for nuances
	- There is a significant amount of options for dealing with images, such as how it is contained in the node, smoothing, opacity, offset, etc. See [this link](https://js.cytoscape.org/#style/background-image).
- `label`: The text on the node, usually the name of a note. 
	- Many standard options for styling this are avabile, see [this link](https://js.cytoscape.org/#style/labels). You can for example change the positioning of the text to be inside the node.
- `display`: Set to none to not display the element.

## Edges
Edges can also be completely styled. See [this link](https://js.cytoscape.org/#style/edge-line) for all options. 
- `width`: Width of the line
- `curve-style`: The style of the curve of the line. There are many, complex options. See [the full documentation](https://js.cytoscape.org/#style/edge-line). By default, Juggl uses Bezier edges, which is relatively expensive. For performance reasons, you can use the haystack style.
- `line-color`: Color of the edge
- `line-style`: Choose from `solid, dotted, dashed`
- `line-opacity`: Opacity of the edge. 
# Snippets
**Style [[Link Types]]**: Color links with the `author` type red.
```css
.type-author {
	line-color: red;
}
```
# Current limitations
- CSS variables like `var(--background-primary)` will not be recognized. If this is something you need, please add a pull request.
- `not()` does not seem to work


--- 
#feature
- author [[Emile van Krieken]]
- hasTopic [[Styling]]