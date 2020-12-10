from smdc import server_args, convert, parse_note, FORMAT_TYPES, Note, note_name, obsidian_url
from watchdog.events import PatternMatchingEventHandler
from watchdog.observers import Observer
import time
from py2neo import Node, Subgraph
from smdc.format.neo4j import node_from_note, add_rels_between_nodes
from smdc.format.cypher import escape_cypher


class SMDSEventHandler():
    def __init__(self, graph, input_format, vault_name):
        self.graph = graph
        self.nodes = graph.nodes
        self.relationships = graph.relationships
        self.input_format = input_format
        self.vault_name = vault_name

    def _clear_outgoing(self, node: Node):
        rels = self.relationships.match([node, None])
        if len(rels) > 0:
            self.graph.separate(Subgraph(relationships=rels))

    def _process_node_on_graph(self, note: Note):
        in_graph = self.nodes.match(name=note.name)
        if len(in_graph) == 0:
            # Create new node
            node = node_from_note(note)
            self.graph.create(node)
            return
        # Update
        node = in_graph.first()
        # Update labels
        node.clear_labels()
        node.update_labels(map(escape_cypher, note.tags))
        # Update properties
        node.clear()
        escaped_properties = {}
        for key, value in note.properties.items():
            escaped_properties[key] = escape_cypher(str(value))
        node.update(escaped_properties)
        self.graph.push(node)

        # Delete active relations
        self._clear_outgoing(node)

        # Insert up-to-date relations
        subgraph = None
        for trgt, rels in note.out_rels.items():
            trgt_node = self.nodes.match(name=trgt)
            if len(trgt_node) == 0:
                trgt_node = Node(name=escape_cypher(trgt),
                                 obsidian_url=escape_cypher(obsidian_url(trgt, self.vault_name)))
                if subgraph is None:
                    subgraph = trgt_node
                else:
                    subgraph = subgraph | trgt_node
            else:
                trgt_node = trgt_node.first()
            # Possibly refactor this with
            subgraph = add_rels_between_nodes(rels, node, trgt_node, subgraph)
        if subgraph is not None:
            self.graph.create(subgraph)

    def on_created(self):
        def _on_created(event):
            # TODO: What if this name already exists in the vault? Does it make sense to override old data?
            note = parse_note(self.input_format, event.src_path, self.vault_name)
            self._process_node_on_graph(note)
        return _on_created

    def on_deleted(self):
        def _on_deleted(event):
            name = note_name(event.src_path)
            node = self.nodes.match(name=name).first()
            in_rels = self.relationships.match([None, node])
            if len(in_rels) > 0:
                # If there are still active incoming links, keep the node as a reference
                node.clear()
                node.name = escape_cypher(name)
                node.obsidian_url = escape_cypher(obsidian_url(name, self.vault_name))
                self._clear_outgoing(node)
            else:
                self.graph.delete(node)
        return _on_deleted

    def on_modified(self):
        def _on_modified(event):
            note = parse_note(self.input_format, event.src_path, self.vault_name)
            self._process_node_on_graph(note)
        return _on_modified

    def on_moved(self):
        def _on_moved(event):
            node = self.nodes.match(name=note_name(event.src_path)).first()
            new_name = note_name(event.dest_path)
            # TODO: What if this name already exists in the vault?
            node.name = new_name
            node.obsidian_url = obsidian_url(new_name, self.vault_name)
            self.graph.push(node)
        return _on_moved

def server(graph, args):
    # Code credit: http://thepythoncorner.com/dev/how-to-create-a-watchdog-in-python-to-look-for-filesystem-changes/
    event_handler = PatternMatchingEventHandler(patterns=["*.md"], case_sensitive=True)

    smds_event_handler = SMDSEventHandler(graph, FORMAT_TYPES[args.input_format], args.vault_name)
    event_handler.on_created = smds_event_handler.on_created()
    event_handler.on_deleted = smds_event_handler.on_deleted()
    event_handler.on_modified = smds_event_handler.on_modified()
    event_handler.on_moved = smds_event_handler.on_moved()

    observer = Observer()
    observer.schedule(event_handler, path=args.input, recursive=args.r)

    observer.start()

    try:
        print("Server is active!")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        observer.join()

def main():
    args = server_args()
    args.output_format = 'neo4j'
    print("initializing server")
    # Initialize the database
    graph = convert(args)

    # Start the server
    server(graph, args)


if __name__ == "__main__":
    main()
