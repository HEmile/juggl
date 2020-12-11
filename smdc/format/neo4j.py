from smdc.format import Format
from smdc.note import Note
import io
from smdc.format.cypher import escape_cypher
from py2neo import Graph, Node, Relationship
from py2neo.database.work import ClientError
import tqdm

CAT_DANGLING = "SMD_dangling"
CAT_NO_TAGS = "SMD_no_tags"

def node_from_note(note:Note) -> Node:
    tags = [CAT_NO_TAGS]
    if note.tags:
        tags = list(map(escape_cypher, note.tags))
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

def create_index(graph, tag, properties):
    for prop in properties:
        graph.run("CREATE INDEX index_" + prop + "_" + tag + " IF NOT EXISTS FOR (n:" + tag + ") ON " + "(n." + prop + ")")

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
            node = node_from_note(note)
            nodes[name] = node
            if node_graph is None:
                node_graph = node
            else:
                node_graph = node | node_graph
        if node_graph is not None:
            print("Transferring nodes to graph")
            tx.create(node_graph)
        all_tags = set()
        for node in nodes.values():
            all_tags.update(node.labels)
        rel_graph = None
        print("Creating relationships")
        i = 1
        for name, note in tqdm.tqdm(parsed_notes.items()):
            if not note.out_rels.keys():
                continue
            src_node = nodes[name]
            for trgt, rels in note.out_rels.items():
                if trgt not in nodes:
                    nodes[trgt] = Node(CAT_DANGLING, name=trgt)
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
        g.run("CALL db.index.fulltext.createNodeIndex(\"SMDnameAlias\", [\"" + "\", \"".join(all_tags) + "\"], [\"name\", \"aliases\"])")
        if args.index_content:
            g.run("CALL db.index.fulltext.createNodeIndex(\"SMDcontent\", [\"" + "\", \"".join(all_tags) + "\"], [\"content\"])")
        create_index(g, CAT_DANGLING, ["name"])
        return g, all_tags


