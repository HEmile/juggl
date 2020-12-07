from __future__ import annotations
import os

class Relationship:
    def __init__(self, type: str, properties={}):
        self.type = type
        self.properties = properties

    def __str__(self):
        return self.type + self.properties.__str__()


class Note:

    def __init__(self, name:str, tags: [str], content:str, properties={}, out_rels={}, in_rels={}):
        self.name = name
        self.tags = tags
        self.content = content
        self.out_rels = out_rels
        self.in_rels = in_rels
        self.properties = properties


    def add_out_rel(self, to:str, rel:Relationship):
        if to in self.out_rels:
            self.out_rels[to].append(rel)
        else:
            self.out_rels[to] = [rel]

    def add_in_rel(self, src: str, rel: Relationship):
        if src in self.in_rels:
            self.in_rels[src].append(rel)
        else:
            self.in_rels[src] = [rel]

    def __str__(self):
        return self.name + os.linesep + self.tags.__str__() + os.linesep + self.content + os.linesep + self.out_rels.__str__()
