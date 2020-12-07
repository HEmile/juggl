from smdc.format import Format
from smdc.note import Note, Relationship
import io
import os
from smdc.format.util import escape_quotes


class CSV(Format):

    def parse(self, file: io.TextIOWrapper, name, parsed_notes: [Note]) -> Note:
        raise NotImplementedError

    def write(self, file, parsed_notes: [Note]):
        # First create all nodes in the graph before doing the relationships, so they all exist.
        with open(file + '.csv', 'w') as f:

            for name, note in parsed_notes.items():

                line = "CREATE ("
                if note.tags:
                    line += ":" + ":".join(note.tags)
                line += " { name: '" + escape_quotes(name) + "', content: '" + escape_quotes(note.content) + "'"
                for property, value in note.properties.items():
                    line += ", " + property + ": '" + escape_quotes(str(value)) + "'"
                line += "});" + os.linesep
                f.write(line)

            for name, note in parsed_notes.items():
                f.write("MATCH (a)" + os.linesep + "WHERE a.name == '" + escape_quotes(name) + "'" + os.linesep)
                i = 0
                for trgt, rels in note.out_rels.items():
                    f.write(
                        "MATCH (b" + str(i) + ")" + os.linesep + "WHERE b" + str(i) + ".name == '" +
                        escape_quotes(trgt) + "'" + os.linesep)
                    for rel in rels:
                        f.write("CREATE (a)-[r:" + rel.type + "]->(b" + str(i) + ")" + os.linesep)
                    i += 1
                f.write(";" + os.linesep)

