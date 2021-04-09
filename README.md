
<p align="left">
    <a href="https://ko-fi.com/Emile" title="Donate to this project using Buy Me A Coffee"><img src="https://img.shields.io/badge/buy%20me%20a%20coffee-donate-yellow.svg" alt="Buy Me A Coffee donate button" width="160"/></a>
    <a href="https://github.com/HEmile/obsidian-neo4j-graph-view/releases">
        <img src="https://img.shields.io/github/downloads/HEmile/obsidian-neo4j-graph-view/total.svg"
            alt="Downloads" width="110"></a> 
    <a href="https://github.com/HEmile/obsidian-neo4j-graph-view/releases">
        <img src="https://img.shields.io/github/v/release/HEmile/obsidian-neo4j-graph-view"
            alt="Github latest release" width="100"></a>
   <a href="https://juggl.io/Neo4j+Graph+View/Neo4j+Graph+View+Plugin">
        <img src="https://img.shields.io/badge/docs-Obsidian-blue"
            alt="Documentation" width="100"></a>
    <a href="https://discord.gg/sAmSGpaPgM">
        <img src="https://img.shields.io/discord/794500624163143720?logo=discord"
            alt="chat on Discord" width="120"></a>
</p>

ANNOUNCEMENT: This plugin has been rewritten with new name Juggl. It no longer requires Neo4j and Python, and has a lot more features than Neo4j graph view.
You can install a release candidate of the new plugin [from this link](https://juggl.io/Installing+Juggl+pre-releases) and it will be on the Obsidian community plugins soon!
The Neo4j Graph View will be removed at that point.

## Neo4j Graph View
![](https://raw.githubusercontent.com/HEmile/obsidian-neo4j-graph-view/main/neo4j-graph-view/resources/styled_screenshot.png)

Documentation at https://juggl.io/Neo4j+Graph+View/Neo4j+Graph+View+Plugin. 

Join the new Discord server to discuss the plugin: https://discord.gg/sAmSGpaPgM

Adds a new and much more functional graph view to Obsidian. It does so by connecting
to a [Neo4j](https://neo4j.com/) database. Features:
- Selectively style nodes and edges by tags, folders and link types
- Selective expansion and hiding of nodes
- View images within the graph
- [Cypher](https://neo4j.com/developer/cypher/) querying
- Typed links using `- linkType [[note 1]], [[note 2|alias]]`
- Hierarchical layout

Next up:
- [x] Remove the need to install Neo4j and Python 
- [ ] Different and more stable front end
- [x] Standardize style sheet using CSS instead of JSON

A [Roadmap](https://juggl.io/Roadmap) with planned features is also available.

![](https://raw.githubusercontent.com/HEmile/obsidian-neo4j-graph-view/main/neo4j-graph-view/resources/obsidian%20neo4j%20plugin.gif)

### Installation
Detailed installation instructions is at https://juggl.io/Neo4j+Graph+View/Installation+of+Neo4j+Graph+View+Plugin
1. Make sure you have [Python 3.6+](https://www.python.org/downloads/) installed. It needs the system-installed Python. Make sure to add Python to PATH!
2. Make sure you have [Neo4j desktop](https://neo4j.com/download/) installed
4. Create a new database in Neo4j desktop and start it. Record the password you use!
5. In the settings of the plugin, enter the password. Then run the restart command.

If installing Python seems daunting, you can wait a couple of weeks. The goal is to port that code to Javascript.

### Use
Detailed getting started guide is at https://juggl.io/Neo4j+Graph+View/Using+the+Neo4j+Graph+View

On an open note, use the command "Neo4j Graph View: Open local graph of note". You can run commands using ctrl/cmd+p. Alternatively, you can bind this command to a hotkey in the settings.

The settings contains several options, such as coloring based on folders and a hierarchical layout. 

#### Cypher Querying
Create code blocks with language `cypher`. In this code block, create your Cypher query. Then, when the cursor is on this
code block, use the Obsidian command 'Neo4j Graph View: Execute Cypher query'. Example: 

![](https://raw.githubusercontent.com/HEmile/obsidian-neo4j-graph-view/main/neo4j-graph-view/resources/cypher_querying.png)


### Possible problems
All changes made in obsidian should be automatically reflected in Neo4j, but this is still very buggy. 

If you are running into issues, see https://juggl.io/Neo4j+Graph+View/Installation+of+Neo4j+Graph+View+Plugin#troubleshooting
### Semantics
The plugin collects all notes with extension .md in the input directory (default: `markdown/`). Each note is interpreted as follows:
- Interprets tags as entity types
- Interprets YAML frontmatter as entity properties
- Interprets wikilinks as links with type `inline`, and adds content
- Lines of the format `"- linkType [[note 1]], [[note 2|alias]]"` creates links with type `linkType` from the current note to `note 1` and `note 2`.
- The name of the note is stored in the property `name`
- The content of the note (everything except YAML frontmatter and typed links) is stored in the property `content`
- Links to notes that do not exist yet are created without any types.


## Other visualization and querying options
Another use case for this plugin is to use your Obsidian vault in one of the many apps in the Neo4j desktop
Graph Apps Store. Using with this plugin active will automatically connect it to your vault. Here are some suggestions:
### Neo4j Bloom
[Neo4j bloom](https://neo4j.com/product/bloom/) is very powerful graph visualization software. Compared to the embedded
graph view in Obsidian, it offers much more freedom in customization.

![](https://raw.githubusercontent.com/HEmile/obsidian-neo4j-graph-view/main/neo4j-graph-view/resources/bloom_screenshot.jpg)

  
### GraphXR
[GraphXR](https://www.kineviz.com/) is a 3D graph view, which looks quite gorgeous!

![](https://raw.githubusercontent.com/HEmile/obsidian-neo4j-graph-view/main/neo4j-graph-view/resources/graphxr.gif)


### Neo4j Browser
A query browser that uses the Cypher language to query your vault. Can be used for advanced queries or data anlysis of
your vault. 

![](https://raw.githubusercontent.com/HEmile/obsidian-neo4j-graph-view/main/neo4j-graph-view/resources/browser_screenshot.png)


## Python code: Semantic Markdown to Neo4j
This Obsidian plugin uses the Python package `semantic-markdown-converter`, which is also in this repo. 
It creates an active data stream from a folder of Markdown notes to a Neo4j database. 
For documentation, see https://juggl.io/Neo4j+Graph+View/Semantic+Markdown+Converter
