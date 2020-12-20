## Neo4j Graph View
![](resources/obsidian%20neo4j%20plugin.gif)

Adds a new and much more functional graph view to Obsidian. It does so by connecting
to a [Neo4j](https://neo4j.com/) database. Features: 
- Color nodes by tags
- Selective expansion and hiding of nodes
- Typed links using `- linkType [[note 1]], [[note 2|alias]]` 
- Hierarchical layout
 
### Installation
1. Make sure you have python 3.6+ installed
2. Make sure you have [Neo4j desktop](https://neo4j.com/download/) installed
4. Create a new database in Neo4j desktop and start it. Record the password you use!
5. In the settings of the plugin, enter the password. Then run the restart command.

### Use
On an open node, use the command "Neo4j Graph View: Open local graph of note". 
- Click on a node to open it in the Markdown view
- Double-click on a node to expand its neighbors
- Shift-drag in the graph view to select nodes
  - Use E to expand the neighbors of all selected nodes
  - Use H or Backspace to hide all selected nodes from the view
  - Use I (invert) to select all nodes that are not currently selected
  - Use A to select all nodes
- All notes visited are added to the graph


### Possible problems
All changes made in obsidian should be automatically reflected in Neo4j, but this is still very buggy. There also seem
to be problems with duplicate nodes in the graph.  

### Semantics
This collects all notes with extension .md in the input directory (default: `markdown/`). Each note is interpreted as follows:
- Interprets tags as entity types
- Interprets YAML frontmatter as entity properties
- Interprets wikilinks as links with type `inline`, and adds content
- Lines of the format `"- linkType [[note 1]], [[note 2|alias]]"` creates links with type `linkType` from the current note to `note 1` and `note 2`.
- The name of the note is stored in the property `name`
- The content of the note (everything except YAML frontmatter and typed links) is stored in the property `content`
- Links to notes that do not exist yet are created without any types.

This uses a very simple syntax for typed links. There is no agreed-upon Markdown syntax for this as of yet. 
If you are interested in using a different syntax than the list format `"- linkType [[note 1]], [[note 2|alias]]"`, 
please  submit an issue.
