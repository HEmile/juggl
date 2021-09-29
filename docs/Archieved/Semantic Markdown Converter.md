---
aliases: []
---

This article is about the [[Python]] code that the [[Neo4j Graph View Plugin]] uses. In the near future, this code will be replaced with [[Javascript]]. See [[Roadmap#Port semantic markdown convert to Javascript]].

## Semantic Markdown to Neo4j
The [[Neo4j Graph View Plugin]] uses the Python package `semantic-markdown-converter`.  The code is [in the same repository](https://github.com/HEmile/semantic-markdown-converter/tree/main/smdc).
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
The command `smdc` only converts the input folder, but does not create a stream. 
#### Neo4j
Streams the input into the currently active Neo4j database. WARNING: This clears all the data in your database by default! Run with `--retaindb` if this is not desired. 
1. Start the database in Neo4j you want to use
2. Run using `smdc --input "folder with notes" --password "neo4j database password"`. This can take a couple of minutes for large vaults. 

--- 
#project #topic
- hasTopic [[Semantic Obsidian]]
- author [[Emile van Krieken]]