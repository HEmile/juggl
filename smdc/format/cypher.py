from smdc.format import Format
from smdc.note import Note, Relationship
import io
import os
from smdc.format.util import escape_quotes


def escape_cypher(string):
    r = escape_quotes(string)
    # Note: CYPHER doesn't allow putting semicolons in text, for some reason. This is lossy!
    r = r.replace(";", ",")
    return r.replace("\\u", "\\\\u")

class Cypher(Format):

    def parse(self, file: io.TextIOWrapper, name, parsed_notes: [Note]) -> Note:
        raise NotImplementedError



    def write(self, file, parsed_notes: [Note]):
        # First create all nodes in the graph before doing the relationships, so they all exist.
        with open(file + '.cypher', 'w') as f:
            f.write("""CREATE CONSTRAINT constraint_name
IF NOT EXISTS ON (n) ASSERT n.name IS UNIQUE;
CREATE INDEX index_name IF NOT EXISTS FOR (n:)
ON (n.name);
""")
            for name, note in parsed_notes.items():
                line = "CREATE ("
                if note.tags:
                    line += ":" + ":".join(note.tags)
                line += " { name: '" + escape_cypher(name) + "', content: '" + escape_cypher(note.content) + "'"
                for property, value in note.properties.items():
                    line += ", " + property + ": '" + escape_cypher(str(value)) + "'"
                line += "});" + os.linesep
                f.write(line)

            notes_in_cypher = set(parsed_notes.keys())

            for name, note in parsed_notes.items():
                if not note.out_rels.keys():
                    continue
                match_a = "MATCH (a)" + os.linesep + "WHERE a.name = '" + escape_cypher(name) + "'" + os.linesep
                for trgt, rels in note.out_rels.items():
                    if trgt not in notes_in_cypher:
                        f.write("CREATE ({name:'" + escape_cypher(trgt) + "'});" + os.linesep)
                        notes_in_cypher.add(trgt)
                    match_b = "MATCH (b)" + os.linesep + "WHERE b.name = '" + \
                               escape_cypher(trgt) + "'" + os.linesep
                    for rel in rels:
                        line = "CREATE (a)-[:" + rel.type + " {"
                        properties = []
                        for property, value in rel.properties.items():
                            properties.append(property + ": '" + escape_cypher(str(value)) + "'")
                        line += ", ".join(properties)
                        line += "}]->(b);" + os.linesep
                        f.writelines([match_a, match_b, line])

