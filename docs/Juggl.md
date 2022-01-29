---
aliases: []
---

Welcome to the documentation of Juggl.

Juggl is the next generation of PKM-focused graph views! It is completely customizable and extendable, with many advanced features out of the box. 

- **Code** is on Github: https://github.com/HEmile/juggl
- **Support the development** of Juggl:
	- Buy me a kofi: https://ko-fi.com/Emile
	- Paypal.me: https://paypal.me/EvanKrieken

# Features
![[juggl trailer.gif]]
## Styling
With Juggl you have completely control over the [[Styling|Style]] of your graph. You can use a special [[Style Pane]] that is very easy to use. For more advanced styling, you can use [[CSS Styling|CSS]] and [[YAML Styling|YAML]].

## Workspace mode
A very extensive new [[Workspace mode]] designed for keeping the focus on just the right notes. 
**Interactivity**: You can control the highly interactive graph using a special **[[Workspace mode#Radial context menu|radial context menu]]** and the [[Workspace mode#Toolbar|toolbar]].
- Select, expand and collapse nodes
- Pin nodes in place
- Hide and filter nodes from view

**[[Workspace mode#Saving and loading|Save and load graphs]]** so you can always continue your work from where you left it.

You can choose from **four [[Layouts|layout]] options**:
1. Force-directed
2. Circle
3. Grid
4. Hierarchical

### Breadcrumbs integration
The popular Obsidian plugin for maintaining hierarchies '[Breadcrumbs](https://github.com/SkepticMystic/breadcrumbs)' is [[Breadcrumbs integration|tightly integrated]] with Juggl! You can render hierachies using Juggl or create custom [[Breadcrumbs code blocks]]! This one of the most useful applications of Juggl. 

![[Pasted image 20220127142536.png]]

### Code block
You can use "[[Juggl code block|code block]]s" to embed graphs within your Obsidian note! You can even use the graph you saved in the [[Workspace mode]]. 

### More!
- **Mobile ready!** While still buggy, the graph works on mobile
- Has a **navigation element** that keeps an overview of the total graph
- Supports stylable [[Link Types]]. You can use this to add labels to edges, for example
- Supports a [[Global Graph mode|global graph]] for small vaults, and an Obsidian-like [[Local Graph mode|local graph]].
- Ready to be extended by other plugins through the [[Juggl API]]

# Implementations and licensing
Juggl currently only has an implementation for [[Obsidian]]. However, the meat of the code is not necessarily reliant on Obsidian and could be ported to other PKM software. If you are interested, you can contact [[Emile van Krieken|me]], preferrably on [[Discord]].

Note that Juggl is GPL3 **dual-**licensed. Contact me for details. 


<iframe src="https://github.com/sponsors/HEmile/card" title="Sponsor HEmile" height="225" width="600" style="border: 0;"></iframe>

--- 
#plugin
- author [[Emile van Krieken]]