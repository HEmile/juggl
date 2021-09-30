---
aliases: []
---

[[Semantic Markdown Converter]] collects all notes with extension .md in the input directory (default: `markdown/`). Each note is interpreted as follows:
- Interprets [[tags]] as [[entity types]]
- Interprets YAML frontmatter as entity properties
- Interprets wikilinks as links with type `inline`, and adds content
- Lines of the format `"- linkType [[note 1]], [[note 2|alias]]"` creates links with type `linkType` from the current note to `note 1` and `note 2`.
- The name of the note is stored in the property `name`
- The content of the note (everything except YAML frontmatter and typed links) is stored in the property `content`
- Links to notes that do not exist yet are created without any types.

This uses a very simple syntax for typed links. There is no agreed-upon [[Markdown]] syntax for this as of yet. See [[Link Types]] for a discussion on different formalizations.


--- 
#howto
- hasTopic 
- author [[Emile van Krieken]]