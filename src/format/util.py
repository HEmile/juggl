import yaml
import os
import re

def parse_yaml_header(file):
    lines = []
    line = file.readline()
    while line != "---" + os.linesep:
        lines.append(line)
        line = file.readline()

    return yaml.safe_load("".join(lines))

def get_tags_from_line(line) -> [str]:
    pos_tags = [i for i, char in enumerate(line) if char == '#']
    tags = []
    for i in pos_tags:
        if i == 0 or line[i - 1] == ' ':
            tag = line[i+1:line.find(' ', i+1)]
            if len(tag) > 0 and tag[0] != "#":
                tags.append(tag)
    return tags

def get_wikilinks_from_line(line) -> [str]:
    result = re.findall('\[\[(.*?)\]\]', line)
    if result:
        r = []
        for wikilink in result:
            r.append(wikilink.split("|")[0])
        return r
    return []
