from smdc import server_args, convert, parse_note, FORMAT_TYPES, Note, note_name, obsidian_url
from watchdog.events import PatternMatchingEventHandler
from watchdog.observers import Observer
import time
from py2neo import Node, Subgraph
from smdc.format.neo4j import node_from_note, add_rels_between_nodes, CAT_DANGLING, CAT_NO_TAGS, create_index
from smdc.format.cypher import escape_cypher
from pathlib import Path
import smdc

class SMDSEventHandler():
    def __init__(self, graph, input_format, vault_name, tags):
        self.graph = graph
        self.nodes = graph.nodes
        self.relationships = graph.relationships
        self.input_format = input_format
        self.vault_name = vault_name
        self.tags = tags

    def _clear_outgoing(self, node: Node):
        rels = self.relationships.match([node, None])
        if len(rels) > 0:
            self.graph.separate(Subgraph(relationships=rels))

    def _process_node_on_graph(self, note: Note):
        if smdc.DEBUG:
            print(note, flush=True)
        in_graph = self.nodes.match(name=note.name)
        if len(in_graph) == 0:
            # Create new node
            node = node_from_note(note)
            if smdc.DEBUG:
                print("creating")
                print(node, flush=True)
            self.graph.create(node)
            return
        # Update
        node = in_graph.first()
        if smdc.DEBUG:
            print("updating")
            print(node, flush=True)
        # Update labels
        node.clear_labels()
        note_tags = [CAT_NO_TAGS]
        if note.tags:
            note_tags = map(escape_cypher, note.tags)
        node.update_labels(note_tags)
        for tag in note_tags:
            if tag not in self.tags:
                properties = ['name', 'aliases']
                # TODO: Is this too slow?
                if True:
                    properties.append("content")
                create_index(self.graph, tag, properties)
                self.tags.add(tag)
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
        rels_to_create = []
        nodes_to_create = []
        for trgt, rels in note.out_rels.items():
            trgt_node = self.nodes.match(name=trgt)
            if len(trgt_node) == 0:
                trgt_node = Node(CAT_DANGLING, name=escape_cypher(trgt),
                                 obsidian_url=escape_cypher(obsidian_url(trgt, self.vault_name)))
                nodes_to_create.append(trgt_node)
            else:
                trgt_node = trgt_node.first()
            # Possibly refactor this with
            add_rels_between_nodes(rels, node, trgt_node, rels_to_create)
        if rels_to_create or nodes_to_create:
            self.graph.create(Subgraph(nodes=nodes_to_create, relationships=rels_to_create))

    def on_created(self):
        def _on_created(event):
            if smdc.DEBUG:
                print("On created", event.src_path, flush=True)
            # TODO: What if this name already exists in the vault? Does it make sense to override old data?
            note = parse_note(self.input_format, event.src_path, self.vault_name)
            self._process_node_on_graph(note)
        return _on_created

    def on_deleted(self):
        def _on_deleted(event):
            if smdc.DEBUG:
                print("On deleted", event.src_path, flush=True)
            name = note_name(event.src_path)
            node = self.nodes.match(name=name).first()
            in_rels = self.relationships.match([None, node])
            if len(in_rels) > 0:
                # If there are still active incoming links, keep the node as a reference
                node.clear()
                node.clear_labels()
                node.add_label(CAT_DANGLING)
                node.name = escape_cypher(name)
                node.obsidian_url = escape_cypher(obsidian_url(name, self.vault_name))
                self._clear_outgoing(node)
            else:
                self.graph.delete(node)
        return _on_deleted

    def on_modified(self):
        def _on_modified(event):
            if smdc.DEBUG:
                print("On modified", event.src_path, flush=True)
            note = parse_note(self.input_format, event.src_path, self.vault_name)
            self._process_node_on_graph(note)
        return _on_modified

    def on_moved(self):
        def _on_moved(event):
            if smdc.DEBUG:
                print("On moved", event.src_path, event.src_path, flush=True)
            node = self.nodes.match(name=note_name(event.src_path)).first()
            new_name = note_name(event.dest_path)
            # TODO: What if this name already exists in the vault?
            node.name = new_name
            node.obsidian_url = obsidian_url(new_name, self.vault_name)
            self.graph.push(node)
        return _on_moved

def stream(graph, tags, args):
    # Code credit: http://thepythoncorner.com/dev/how-to-create-a-watchdog-in-python-to-look-for-filesystem-changes/
    event_handler = PatternMatchingEventHandler(patterns=["*.md"], case_sensitive=True)

    smds_event_handler = SMDSEventHandler(graph, FORMAT_TYPES[args.input_format], args.vault_name, tags)
    event_handler.on_created = smds_event_handler.on_created()
    event_handler.on_deleted = smds_event_handler.on_deleted()
    event_handler.on_modified = smds_event_handler.on_modified()
    event_handler.on_moved = smds_event_handler.on_moved()

    observer = Observer()
    path = Path(args.input)
    if smdc.DEBUG:
        print(path.absolute(), flush=True)
    observer.schedule(event_handler, path=Path(args.input), recursive=args.r)

    observer.start()

    try:
        print("Stream is active!", flush=True)
        import sys
        sys.stdout.flush()
        while True:
            # TODO: Catch when connection to neo4j server is down.
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        observer.join()

def main():
    args = server_args()
    args.output_format = 'neo4j'
    # Initialize the database
    graph, tags = convert(args)
    # return
    # Start the server
    stream(graph, tags, args)


if __name__ == "__main__":
    main()
