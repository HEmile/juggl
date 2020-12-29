from smdc.format import Format
from smdc.note import Note, Relationship
import io
import os
from smdc.format.util import parse_yaml_header, get_tags_from_line, get_wikilinks_from_line, PUNCTUATION, markdownToHtml


class TypedList(Format):

    def parse_word(self, line, index, breaks=[' ', os.linesep, ',']):
        if index >= len(line):
            return index
        for j in range(index, len(line)):
            if line[j] in breaks:
                return j

        return j

    def move_index(self, line, index):
        if index >= len(line):
            return index
        for j in range(index, len(line)):
            if line[j] != ' ':
                return j

        return j

    def parse(self, file: io.TextIOWrapper, name, parsed_notes: [Note], args) -> Note:
        line = file.readline()
        parsed_yaml = None
        # Find YAML header, or continue
        while line:
            if line.strip():
                if line == '---' + os.linesep:
                    try:
                        parsed_yaml = parse_yaml_header(file)
                    except Exception as e:
                        print(e)
                break
            line = file.readline()

        content = []
        relations = {}
        tags = []
        while line:
            if line.startswith(f"{args.typed_links_prefix} ") and len(line) > 2:
                is_rel = True
                index = self.parse_word(line, 2, breaks=PUNCTUATION)
                type = line[2:index]
                if len(type) != 0:
                    index = self.move_index(line, index + 1)
                    words = []
                    while index < len(line) - 2:
                        new_index = self.parse_word(line, index)
                        words.append(line[index:new_index])
                        index = self.move_index(line, new_index + 1)
                    year = None
                    trgts = []
                    active_trgt = None
                    for i, word in enumerate(words):
                        if word[:2] == "[[":
                            if active_trgt:
                                is_rel = False
                                break
                            if word[-2:] == "]]":
                                trgts.append(word[2:-2].split("|")[0])
                            else:
                                active_trgt = word[2:]
                            continue
                        elif word[-2:] == "]]":
                            if not active_trgt:
                                is_rel = False
                                break
                            trgts.append((active_trgt + " " +  word[:-2]).split("|")[0])
                            active_trgt = None
                            continue
                        if i == 0 and type in ['publishedIn', 'at']:
                            year = word
                        elif active_trgt:
                            active_trgt += " " + word
                        else:
                            is_rel = False
                            break
                    if is_rel:
                        for trgt in trgts:
                            properties = {}
                            if year:
                                properties["year"] = year
                            rel = Relationship(type, properties)
                            if trgt in relations:
                                relations[trgt].append(rel)
                            else:
                                relations[trgt] = [rel]
                        line = file.readline()
                        continue
            content.append(line)
            for tag in get_tags_from_line(line):
                if tag not in tags:
                    tags.append(tag)
            # TODO: Save aliases as Relation property
            for wikilink in get_wikilinks_from_line(line):
                rel = Relationship("inline",
                                   properties={"context": markdownToHtml(line) if args.convert_markdown else line})
                if wikilink in relations:
                    relations[wikilink].append(rel)
                else:
                    relations[wikilink] = [rel]
            line = file.readline()
        raw_content = markdownToHtml("".join(content)) if args.convert_markdown else "".join(content)
        return Note(name, tags, raw_content, out_rels=relations, properties=parsed_yaml if parsed_yaml else {})

    def write(self, file, parsed_notes: [Note]):
        raise NotImplementedError