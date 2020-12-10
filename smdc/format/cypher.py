from smdc.format import Format
from smdc.note import Note, Relationship
import io
import os
from smdc.format.util import escape_quotes


def escape_cypher(string):
    r = escape_quotes(string)
    # Note: CYPHER doesn't allow putting semicolons in text, for some reason. This is lossy!
    r = r.replace(";", ",")
    r = r.replace("\\u", "\\\\u")
    if r and r[-1] == '\\':
        r += ' '
    return r

def to_cyper(parsed_notes: [Note]):
    lines = []
    # First create all nodes in the graph before doing the relationships, so they all exist.
    for name, note in parsed_notes.items():
        line = "CREATE ("
        if note.tags:
            line += ":" + ":".join(note.tags) + " {"
        properties = []
        for property, value in note.properties.items():
            properties.append(property + ": '" + escape_cypher(str(value)) + "'")
        line += ", ".join(properties)
        line += "});"
        lines.append(line)

    notes_in_cypher = set(parsed_notes.keys())

    for name, note in parsed_notes.items():
        if not note.out_rels.keys():
            continue
        match_a = "MATCH (a)" + os.linesep + "WHERE a.name = '" + escape_cypher(name) + "'" + os.linesep
        for trgt, rels in note.out_rels.items():
            if trgt not in notes_in_cypher:
                lines.append("CREATE ({name:'" + escape_cypher(trgt) + "'});")
                notes_in_cypher.add(trgt)
            match_b = "MATCH (b)" + os.linesep + "WHERE b.name = '" + \
                      escape_cypher(trgt) + "'" + os.linesep
            for rel in rels:
                line = "CREATE (a)-[:" + rel.type + " {"
                properties = []
                for property, value in rel.properties.items():
                    properties.append(property + ": '" + escape_cypher(str(value)) + "'")
                line += ", ".join(properties)
                line += "}]->(b);"
                lines.append(match_a + match_b + line)
    return lines

class Cypher(Format):

    def parse(self, file: io.TextIOWrapper, name, parsed_notes: [Note]) -> Note:
        raise NotImplementedError

    def write(self, parsed_notes: [Note], args):
        lines = to_cyper(parsed_notes)
        with open(args.output + '.cypher', 'w', encoding='utf-8') as f:
            f.writelines(os.linesep.join(lines))


