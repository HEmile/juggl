# Semantic Markdown converter
 Converts different typed link formats in Markdown into each other and to external formats. Designed for visualizing obsidian.md vaults using [Neo4j bloom](https://neo4j.com/product/bloom/).

## Requirements
Python 3.5+. 

`pip install tqdm, yaml`

Then run `convert.py`

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


## Supported output formats
Currently, only the propietary Neo4j CYPHER format is supported. This is rather slow. I'll try to do a CSV format soon. 
### Neo4j CYPHER
Converts the input into a single .cypher file (default: `out.cypher`) with statements that create nodes and relationships in Neo4j. This can be loaded in Neo4j desktop as follows:
1. Create a new Database
2. Manage your database (three dots, Manage)
    1. Plugins -> Install APOC
    2. Settings: Add line `apoc.import.file.enabled=true`
    3. Open project folder, then copy `out.cypher` to the import folder within the project folder.
3. Start database
4. Open Neo4j browser
    1. Run `CALL apoc.cypher.runFile('out.cypher')`
    
Importing with Cypher can take quite a while (multiple minutes). I'll look into alternative methods if people are interested.

## Neo4j Bloom
A use case for this converter is to visualize your obsidian.md graph in [Neo4j bloom](https://neo4j.com/product/bloom/). Neo4j bloom is very powerful graph visualization software 
Compared to the Obsidian graph view, it allows
- Coloring and styling notes with different tags
- Coloring and styling relationships with different types
- Selective expansion
- A hierarchical view
- Very strong querying capabilities