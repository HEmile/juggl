from smdc.format import Format
from smdc.note import Note
import io
from smdc.format.cypher import escape_cypher
from smdc.parse import obsidian_url
from py2neo import Graph, Node, Relationship, Subgraph
from py2neo.database.work import ClientError
import tqdm

CAT_DANGLING = "SMD_dangling"
CAT_NO_TAGS = "SMD_no_tags"

def node_from_note(note:Note, all_tags: [str]) -> Node:
    tags = [CAT_NO_TAGS]
    if note.tags:
        tags = list(map(escape_cypher, note.tags))
        for tag in tags:
            if tag not in all_tags:
                all_tags.append(tag)
    properties = {}
    for property, value in note.properties.items():
        properties[property] = escape_cypher(str(value))
    properties["community"] = all_tags.index(tags[0])
    return Node(*tags, **properties)

def add_rels_between_nodes(rels, src_node, trgt_node, subgraph: [Relationship]):
    # Adds all relations between src node and trgt node as described in rels to subgraph
    for rel in rels:
        properties = {}
        for property, value in rel.properties.items():
            properties[property] = escape_cypher(str(value))
        subgraph.append(Relationship(src_node, escape_cypher(rel.type), trgt_node, **properties))


def create_index(graph, tag, properties):
    for prop in properties:
        graph.run("CREATE INDEX index_" + prop + "_" + tag + " IF NOT EXISTS FOR (n:" + tag + ") ON " + "(n." + prop + ")")

def create_dangling(name:str, vault_name:str, tags: [str]) -> Node:
    return Node(CAT_DANGLING, name=escape_cypher(name), community=tags.index(CAT_DANGLING),
                                 obsidian_url=escape_cypher(obsidian_url(name, vault_name)))

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
        all_tags = [CAT_NO_TAGS, CAT_DANGLING]
        # First create all nodes in the graph before doing the relationships, so they all exist.
        for name, note in tqdm.tqdm(parsed_notes.items()):
            node = node_from_note(note, all_tags)
            nodes[name] = node

        if nodes:
            print("Transferring nodes to graph")
            tx.create(Subgraph(nodes=nodes.values()))

        rels_to_create = []
        nodes_to_create = []
        print("Creating relationships")
        i = 1
        for name, note in tqdm.tqdm(parsed_notes.items()):
            if not note.out_rels.keys():
                continue
            src_node = nodes[name]
            for trgt, rels in note.out_rels.items():
                if trgt not in nodes:
                    nodes[trgt] = create_dangling(trgt, args.vault_name, all_tags)
                    nodes_to_create.append(nodes[trgt])
                trgt_node = nodes[trgt]
                add_rels_between_nodes(rels, src_node, trgt_node, rels_to_create)
            # Send batches to server. Greatly speeds up conversion.
            if i % args.batch_size == 0:
                tx.create(Subgraph(nodes=nodes_to_create, relationships=rels_to_create))
                rels_to_create = []
                nodes_to_create = []
            i += 1
        if rels_to_create or nodes_to_create:
            tx.create(Subgraph(nodes=nodes_to_create, relationships=rels_to_create))
        print("Committing data")
        tx.commit()

        print("Creating index")
        properties = ['name', 'aliases']

        # TODO: Schema inference for auto-indexing?
        for tag in tqdm.tqdm(all_tags):
            create_index(g, tag, properties)
        try:
            g.run("CALL db.index.fulltext.drop(\"SMDnameAlias\")")
        except ClientError:
            pass
        try:
            g.run("CALL db.index.fulltext.drop(\"SMDcontent\")")
        except ClientError:
            pass
        if all_tags:
            g.run("CALL db.index.fulltext.createNodeIndex(\"SMDnameAlias\", [\"" + "\", \"".join(all_tags) + "\"], [\"name\", \"aliases\"])")
            if args.index_content:
                g.run("CALL db.index.fulltext.createNodeIndex(\"SMDcontent\", [\"" + "\", \"".join(all_tags) + "\"], [\"content\"])")
            create_index(g, CAT_DANGLING, ["name"])
        return g, all_tags


