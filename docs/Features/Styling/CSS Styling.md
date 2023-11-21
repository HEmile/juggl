---
aliases: [CSS]
image: "files/CypherQuerying.png"
---

For complete control over [[Styling]], you can use CSS. This has a somewhat higher learning curve, but is extremely powerful! It allows you to create rule-based styling so you can visually represent concepts or attributes in your vault. 

To use the CSS functionality, edit `.obsidian/plugins/juggl/graph.css`. Edits in this file should automatically change the style of currently open graphs. 
You can also open this file from the Juggl settings:

![[Pasted image 20210422092407.png]]

This document acts as an overview of common and useful options for Juggl. For documentation on everything that's possible (_a lot!_), see the [Cytoscape.js styling documentation](https://js.cytoscape.org/#style).

We will first discuss how to [[#Selectors|select certain objects]], then discuss common [[#Properties|properties]] you might want to change, then finally show a couple of [[#Snippets|snippets]] to get started. 

If you prefer to start off with examples, I'd recommend immediately jumping to [[#Snippets]]. 

If you need more help, feel free to join the [[Discord]] where help is provided for all your styling questions!

Note: you must include the semicolon at the end of each declaration, even though there is just one in a block.

# Selectors
[Selectors](https://www.w3schools.com/cssref/css_selectors.asp) are used to filter what objects to style. The two main 'elements' that can be targeted are `node` and `edge`.	
## Classes
Classes can be selected using `.class`. Available classes that are useful to style different nodes in Juggl are:
- `.tag-tagname`: Targets all nodes with the tag #tagname
- `.type-typename`: Targets all edges with the [[Link Types|type]] 'typename'
- `.has-incoming-typename`: Targets all nodes that have an edge with [[type]] 'typename' coming into it. 
- `.has-outgoing-typename`: Targets all nodes that have an edge with [[type]] 'typename' going out of it. 
- Any class in the `cssclass` property in your [[YAML Styling|YAML]] frontmatter is also available on that node.
- `.dangling`: Targets dangling nodes (nodes that aren't created as a file)
- `.image`: Targets all nodes that are rendered as images. This is image files, but also notes that are styled with the `image` [[YAML Styling|YAML]] property. Similar for `.audio`, `.video` and `.pdf`.
- `.file`: Targets all attachments (everything that does not have the `.md` extension)
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

### Nodes
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
	
### Edges
- `context`: The line the link is in. This gives some context about where the link is used and is used in the edge hover preview. Can be used to filter for certain lines with the same structure.
- `alias`: The alias used on the link. Only present if an alias is used. 
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
	- Many standard options for styling this are available like the `font-family`, see [this link](https://js.cytoscape.org/#style/labels). You can for example change the positioning of the text to be inside the node. The 
- `display`: Set to none to not display the element.

## Edges
Edges can also be completely styled. See [this link](https://js.cytoscape.org/#style/edge-line) for all options. 
- `width`: Width of the line
- `curve-style`: The style of the curve of the line. There are many, complex options. See [the full documentation](https://js.cytoscape.org/#style/edge-line). By default, Juggl uses Bezier edges, which is relatively expensive. For performance reasons, you can use the haystack style.
- `line-color`: Color of the edge
- `line-style`: Choose from `solid, dotted, dashed`
- `line-opacity`: Opacity of the edge. 
- `label`: The text on the node
# Snippets
**Style [[Link Types]]**: Color links with the `author` type red.
```css
.type-author {
	line-color: red;
}
```

**Map cooking time to colour**: Changes from the color blue to red depending on how long it takes to cook a meal:
```css
node[cooking-time] {
    background-color: mapData(cooking-time, 1, 120, blue, red);
}
```

**Change opacity and width of a line**, depending on how many connections (from 1 to 15) there are from one node to the other:
```css
edge[edgeCount] {
    width: mapData(edgeCount, 1, 15, 0.5, 3);
	line-opacity: mapData(edgeCount, 1, 15, 0.5, 0.9);
}
```

**Display the context of a link**: This will display the sentences around where the link appears. This can be a bit messy!
```css
edge.inline {
   label: data(context);
   text-opacity: 0.8;
   font-size: 2;
   text-wrap: ellipsis;
   text-max-width: 100px;
}
```

![[Pasted image 20210414175943.png|500]]

You can also only show this whenever you are hovering over the edge. You have to activate 'Hover on edges' in the Juggl settings for this feature:
```css
edge.inline.hover {
   label: data(context);
   ...
}
```

**Text in a box**: One styling I love is to have rectangle nodes that contain some text. This can be achieved (imperfectly!) using
```css
.tag-paper {
    shape: rectangle;
    width: 50px;
    height: 45px;
    font-size: 5;
    text-valign: center;
    text-max-width: 45px;
    text-opacity: 1;
}
```

![[Pasted image 20210414182140.png|400]]

**Text wrapping for non-Latin script**: The text in a box will not work for languages using different script, like Japanese. For these, you could try the following snippet by Kazdon:
```css
.note {  
   shape: rectangle;  
   width: 40px;  
   height: 20px;  
   text-valign: center;  
   text-max-width: 35px;  
   text-overflow-wrap: anywhere;  
}
```
And similar for inline context on edges:
```css
edge.inline {
   label:data(context);  
   text-wrap: wrap;  
   text-max-width: 250px;  
   text-overflow-wrap: anywhere;
}
```
**Only show icons, not shapes**: If you only want to show the icon of a node and not the shape around it, you can use
```css
node {
	background-opacity: 0;
	border: 0;
	shape: rectangle;
}
```
![[Pasted image 20220121103800.png]]

# Current limitations

- CSS variables like `var(--background-primary)` will not be recognized. If this is something you need, please add a pull request.

- `not()` does not seem to work.

--- 
#feature
- author [[Emile van Krieken]]
- hasTopic [[Styling]]
