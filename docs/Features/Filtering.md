---
aliases: [Filter, filter, filters]
---

You can filter the nodes in the graph using the Filter toolbar: 

![[Pasted image 20210413145227.png]]

This filter also appears in the [[Style Pane]]:

![[Pasted image 20210413145921.png]]

The syntax of this simulates [the search syntax in Obsidian](https://help.obsidian.md/Plugins/Search), with some limitations and extra features.

# Search Operators
- `file:`, `path:`, `content:` and `tag:` all work as documented in the [Obsidian help vault](https://help.obsidian.md/Plugins/Search)
- `class:`: Search based on [[CSS Styling#Classes|CSS class]].
- `raw:`: Search using a [[CSS Styling#Selectors|CSS selector]].
- Any attribute you use in your YAML frontmatter can be used for querying, for instance `aliases:`, `color:` and `title:`. 

## Tips
- Hiding **attachments**: `-class:file`
- Hiding **images**: `-class:image`
- Hiding **dangling nodes**:  `-class:dangling`
- You can add those filters to the [[Style Pane]] to quickly hide and unhide them

## Limitations
Regex does not work, nor do  the `section:`, `line:` and `block:` operators. 

--- 
#feature 
- author [[Emile van Krieken]]