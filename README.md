## Neo4j Graph View
![](https://raw.githubusercontent.com/HEmile/semantic-markdown-converter/main/obsidian%20plugin/resources/obsidian%20neo4j%20plugin.gif)

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

If you are running into issues, enable Debug in the settings and check out the developer console (View -> Toggle Developer Tools). On Windows, this can be opened using Ctrl+Shift+I. Here are some issues found so far: 
- `xcrun: error: invalid active developer path...  missing xcrun at...`: [Install xcrun)](https://apple.stackexchange.com/questions/254380/why-am-i-getting-an-invalid-active-developer-path-when-attempting-to-use-git-a) in terminal using `xcode-select --install` 

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

## Other visualization and querying options
Another use case for this plugin is to use your Obsidian vault in one of the many apps in the Neo4j desktop
Graph Apps Store. Using with this plugin active will automatically connect it to your vault. Here are some suggestions:
### Neo4j Bloom
[Neo4j bloom](https://neo4j.com/product/bloom/) is very powerful graph visualization software. Compared to the embedded
graph view in Obsidian, it offers much more freedom in customization.

![](https://raw.githubusercontent.com/HEmile/semantic-markdown-converter/main/obsidian%20plugin/resources/bloom_screenshot.jpg)

  
### GraphXR
[GraphXR](https://www.kineviz.com/) is a 3D graph view, which looks quite gorgeous!

![](https://raw.githubusercontent.com/HEmile/semantic-markdown-converter/main/obsidian%20plugin/resources/graphxr.gif)


### Neo4j Browser
A query browser that uses the Cypher language to query your vault. Can be used for advanced queries or data anlysis of
your vault. 

![](https://raw.githubusercontent.com/HEmile/semantic-markdown-converter/main/obsidian%20plugin/resources/browser_screenshot.png)


## Python code: Semantic Markdown to Neo4j
This Obsidian plugin uses the Python package `semantic-markdown-converter`, which is also in this repo. 
It creates an active data stream from a folder of Markdown notes to a Neo4j database. 

### Getting started
Note: The obsidian plugin automatically installs this package!

Requires python 3.5+ and Neo4j desktop

- Install with `pip install --upgrade semantic-markdown-converter`
- Create a new database in Neo4j desktop and start it 
- Run `smds --input "folder with notes" --password "neo4j database password"`

WARNING: This clears all current data in the active neo4j database!
### Supported input formats
There is currently only one input format supported. An issue or use a pull request for different formats are appreciated! In particular for different markdown syntax for interpreting semantic links.

### Semantic Markdown to Neo4j server
The command `smds` first uploads the complete folder of notes into the active Neo4j database. Then, it listens to changes in the notes to update the Neo4j database.

#### Options
- `--password`: Provide the password of the Neo4j database
- `--input`: Provide the folder where to look for notes
- `--index_content`: Set to true if you want Neo4j Bloom to search through the content of your notes when using the search bar. Can impact performance.

### Conversion mode
The command `smdc` only converts 
#### Neo4j
Streams the input into the currently active Neo4j database. WARNING: This clears all the data in your database by default! Run with `--retaindb` if this is not desired. 
1. Start the database in Neo4j you want to use
2. Run using `smdc --input "folder with notes" --password "neo4j database password"`. This can take a couple of minutes for large vaults. 



