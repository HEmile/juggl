# Semantic Markdown to Neo4j
 Creates an active data stream from a folder of Markdown notes to a Neo4j database. Designed for visualizing obsidian.md vaults using [Neo4j bloom](https://neo4j.com/product/bloom/) by streaming the vault to neo4j. 

## Getting started
Requires python 3.5+ and Neo4j desktop

- Install with `pip install --upgrade semantic-markdown-converter`
- Create a new database in Neo4j desktop and start it 
- Run `smds --input "folder with notes" --password "neo4j database password"`

WARNING: This clears all current data in the active neo4j database!
## Supported input formats
There is currently only one input format supported. An issue or use a pull request for different formats are appreciated! In particular for different markdown syntax for interpreting semantic links.
### Plain markdown with a rudimentary typed links format. 
This collects all notes with extension .md in the input directory (default: `markdown/`). Each note is interpreted as follows:
- Interprets tags as entity types
- Interprets YAML frontmatter as entity properties
- Interprets wikilinks as links with type `inline`, and adds content
- Lines of the format `"- linkType [[note 1]], [[note 2|alias]]"` creates links with type `linkType` from the current note to `note 1` and `note 2`.
- The name of the note is stored in the property `name`
- The content of the note (everything except YAML frontmatter and typed links) is stored in the property `content`
- Links to notes that do not exist yet are created without any types.
- The obsidian url is added as property `obsidian_url`

## Semantic Markdown to Neo4j server
The command `smds` first uploads the complete folder of notes into the active Neo4j database. Then, it listens to changes in the notes to update the Neo4j database.

### Options
- `--password`: Provide the password of the Neo4j database
- `--input`: Provide the folder where to look for notes
- `--index_content`: Set to true if you want Neo4j Bloom to search through the content of your notes when using the search bar. Can impact performance.

## Conversion mode
The command `smdc` only converts 
### Neo4j
Streams the input into the currently active Neo4j database. WARNING: This clears all the data in your database by default! Run with `--retaindb` if this is not desired. 
1. Start the database in Neo4j you want to use
2. Run using `smdc --input "folder with notes" --password "neo4j database password"`. This can take a couple of minutes for large vaults. 

### CYPHER
Converts the input into a single .cypher file (default: `out.cypher`) with statements that create nodes and relationships in Neo4j. This can be loaded in Neo4j desktop as follows:
1. Run `smdc --input "folder with notes" --output_format "cypher"`
1. Create a new database
2. Manage your database (three dots, manage)
    1. Plugins -> Install APOC
    2. Settings: Add line `apoc.import.file.enabled=true`
    3. Open project folder, then copy `out.cypher` to the import folder within the project folder.
3. Start database
4. Open Neo4j browser
    1. Run `CALL apoc.cypher.runFile('out.cypher')`
    
Importing with Cypher can take quite a while (multiple minutes). I'll look into alternative methods if people are interested.

## Neo4j Bloom
A use case for this converter is to visualize your obsidian.md graph in [Neo4j bloom](https://neo4j.com/product/bloom/). Neo4j bloom is very powerful graph visualization software. 
Compared to the Obsidian graph view, it allows
- Coloring and styling notes with different tags
- Coloring and styling relationships with different types
- Selective expansion
- A hierarchical view
- Very strong querying capabilities
