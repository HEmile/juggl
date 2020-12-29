import yaml
import os
import re
import markdown
from markdown.extensions import Extension
from markdown.extensions.wikilinks import WikiLinkExtension
from markdown.preprocessors import Preprocessor
import re

def parse_yaml_header(file):
    lines = []
    line = file.readline()
    while line != "---" + os.linesep and line:
        lines.append(line)
        line = file.readline()

    return yaml.safe_load("".join(lines))


class HashtagExtension(Extension):
    # Code based on https://github.com/Kongaloosh/python-markdown-hashtag-extension/blob/master/markdown_hashtags/markdown_hashtag_extension.py
    # Used to extract tags from markdown
    def extendMarkdown(self, md):
        """ Add FencedBlockPreprocessor to the Markdown instance. """
        md.registerExtension(self)
        md.preprocessors.register(HashtagPreprocessor(md), 'hashtag', 10) # After HTML Pre Processor


class HashtagPreprocessor(Preprocessor):
    ALBUM_GROUP_RE = re.compile(
            r"""(?:(?<=\s)|^)#(\w*[A-Za-z_]+\w*)"""
    )

    def __init__(self, md):
        super(HashtagPreprocessor, self).__init__(md)

    def run(self, lines):
        """ Match and store Fenced Code Blocks in the HtmlStash. """
        HASHTAG_WRAP = '''<a href="#{0}" class="tag"> #{0}</a>'''
        text = "\n".join(lines)
        while True:
            hashtag = ''
            m = self.ALBUM_GROUP_RE.search(text)
            if m:
                hashtag += HASHTAG_WRAP.format(m.group()[1:])
                placeholder = self.markdown.htmlStash.store(hashtag)
                text = '%s %s %s' % (text[:m.start()], placeholder, text[m.end():])
            else:
                break
        return text.split('\n')


# def makeExtension(*args, **kwargs):
#     return HashtagExtension(*args, **kwargs)

def markdownToHtml(md_text):
    return markdown.markdown(md_text, extensions=['mdx_wikilink_plus','fenced_code',
                                                  'footnotes', 'tables', HashtagExtension()],
                             extension_configs={
                                 'mdx_wikilink_plus': {
                                     'html_class': 'internal-link',
                                     'url_whitespace': ' '
                                 }
                             })

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
