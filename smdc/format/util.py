import yaml
import os
import re

def parse_yaml_header(file):
    lines = []
    line = file.readline()
    while line != "---" + os.linesep and line:
        lines.append(line)
        line = file.readline()

    return yaml.safe_load("".join(lines))

PUNCTUATION = ["#", "$", "!", ".", ",", "?", "/", ":", ";", "`", " ", "-", "+", "=", "|", os.linesep] + [str(i) for i in range(0, 10)]


def get_tags_from_line(line) -> [str]:
    pos_tags = [i for i, char in enumerate(line) if char == '#']
    tags = []
    for i in pos_tags:
        if i == 0 or line[i - 1] == ' ':
            index = next((index for index, c in enumerate(line[i+1:]) if c in PUNCTUATION), -1)
            if index == -1:
                tags.append(line[i+1:])
            else:
                tag = line[i + 1:index + i + 1]
                if len(tag) > 0:
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

def escape_quotes(string) -> str:
    r1 = string.replace("\\\'", "\\\\\'")
    r1 = r1.replace("'", "\\\'")
    return r1.replace('\"', "\\\"")
