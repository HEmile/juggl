from smdc.format import Format
from smdc.note import Note
import io
import os
from smdc.format.cypher import escape_cypher
from py2neo import Graph, Node, Relationship, Subgraph
from py2neo.database.work import ClientError
import tqdm
from typing import Set

def node_from_note(note:Note) -> Node:
    tags = ["_no_tags"]
    if note.tags:
        tags = map(escape_cypher, note.tags)
    properties = {}
    for property, value in note.properties.items():
        properties[property] = escape_cypher(str(value))
    return Node(*tags, **properties)

def add_rels_between_nodes(rels, src_node, trgt_node, subgraph):
    # Adds all relations between src node and trgt node as described in rels to subgraph
    for rel in rels:
        properties = {}
        for property, value in rel.properties.items():
            properties[property] = escape_cypher(str(value))
        rel = Relationship(src_node, escape_cypher(rel.type), trgt_node, **properties)
        if subgraph is None:
            subgraph = rel
        else:
            subgraph = subgraph | rel
    return subgraph

class Neo4j(Format):

    def parse(self, file: io.TextIOWrapper, name, parsed_notes: [Note]) -> Note:
        raise NotImplementedError

    def write(self, parsed_notes: [Note], args):
        try:
            g = Graph(password=args.password)
        except ClientError as e:
            print(e)
            raise Exception("Please provide a password through smdc --password <pwd>!")
        tx = g.begin()
        if not args.retaindb:
            print("Clearing neo4j database")
            tx.run("MATCH (n) DETACH DELETE n")

        nodes = {}
        print("Converting nodes")
        node_graph = None
        # First create all nodes in the graph before doing the relationships, so they all exist.
        for name, note in tqdm.tqdm(parsed_notes.items()):
            if name == 'strang':
                print("here")
            node = node_from_note(note)
            nodes[name] = node
            if node_graph is None:
                node_graph = node
            else:
                node_graph = node | node_graph
        if node_graph is not None:
            tx.create(node_graph)
        rel_graph = None
        print("Creating relationships")
        i = 1
        for name, note in tqdm.tqdm(parsed_notes.items()):
            if not note.out_rels.keys():
                continue
            src_node = nodes[name]
            for trgt, rels in note.out_rels.items():
                if trgt not in nodes:
                    nodes[trgt] = Node(name=trgt)
                    # node_graph = node_graph | nodes[trgt]
                    if rel_graph is None:
                        rel_graph = nodes[trgt]
                    else:
                        rel_graph = rel_graph | nodes[trgt]
                trgt_node = nodes[trgt]
                rel_graph = add_rels_between_nodes(rels, src_node, trgt_node, rel_graph)
            # Send batches to server. Greatly speeds up conversion.
            if i % args.batch_size == 0:
                tx.create(rel_graph)
                rel_graph = None
            i += 1
        if rel_graph is not None:
            tx.create(rel_graph)
        print("Committing data")
        tx.commit()
        return g


