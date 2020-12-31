from smdc import server_args, convert, parse_note, FORMAT_TYPES, Note, note_name, obsidian_url
from watchdog.events import PatternMatchingEventHandler
from watchdog.observers import Observer
import time
from py2neo import Node, Subgraph, Relationship
from py2neo.data import walk
from smdc.format.neo4j import node_from_note, add_rels_between_nodes, CAT_DANGLING, CAT_NO_TAGS, create_index, \
    create_dangling, PROP_COMMUNITY, get_community
from smdc.format.cypher import escape_cypher
from pathlib import Path
import smdc
from smdc.parse import PROP_VAULT, PROP_PATH


def wrapper(fn):
    def _return(event):
        try:
            fn(event)
        except BaseException as e:
            print(e)
    return _return


class SMDSEventHandler():
    def __init__(self, graph, tags: [str], communities: [str], args):
        self.graph = graph
        self.nodes = graph.nodes
        self.relationships = graph.relationships
        self.args = args
        self.input_format = FORMAT_TYPES[args.input_format]
        self.vault_name = args.vault_name
        self.index_content = args.index_content
        self.tags = tags
        self.communities = communities

    def _clear_outgoing(self, node: Node):
        rels = self.relationships.match([node, None])
        if len(rels) > 0:
            self.graph.separate(Subgraph(relationships=rels))

    def _process_node_on_graph(self, note: Note):
        if smdc.DEBUG:
            print(note, flush=True)
        in_graph = self.nodes.match(**{'name': note.name, PROP_VAULT: self.vault_name})
        if len(in_graph) == 0:
            # Create new node
            node = node_from_note(note, self.tags, self.communities, self.args.community)
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
            note_tags = list(map(escape_cypher, note.tags))
        node.update_labels(note_tags)
        for tag in note_tags:
            if tag not in self.tags:
                create_index(self.graph, tag)
                self.tags.append(tag)
        # Update properties
        node.clear()
        escaped_properties = {}
        for key, value in note.properties.items():
            escaped_properties[key] = escape_cypher(str(value))
        escaped_properties[PROP_COMMUNITY] = get_community(note, self.communities, self.args.community)
        node.update(escaped_properties)
        self.graph.push(node)

        # # Delete active relations
        # self._clear_outgoing(node)

        # Insert up-to-date relations
        rels_to_create = []
        nodes_to_create = []
        active_rels = list(self.relationships.match([node, None]))
        for trgt, rels in note.out_rels.items():
            trgt_node = self.nodes.match(**{'name': trgt, PROP_VAULT: self.vault_name})
            if len(trgt_node) == 0:
                trgt_node = create_dangling(trgt, self.vault_name, self.tags)
                nodes_to_create.append(trgt_node)
            else:
                trgt_node = trgt_node.first()
            # Possibly refactor this with
            for i, rel in enumerate(rels):
                properties = {}
                for property, value in rel.properties.items():
                    properties[property] = escape_cypher(str(value))
                rel_type = escape_cypher(rel.type)
                rem_rel = None
                compare_rel = Relationship(node, rel_type, trgt_node)
                # Update instead of removing makes sure the relationship has a persistent id
                for active_rel in active_rels:
                    walks = list(walk(active_rel))
                    if type(active_rel).__name__ == rel_type and walks[2] == trgt_node:
                    # if compare_rel == active_rel:
                        # Maybe this can leave dangling properties? But that'' an edge case. Not sure how to clear properties.
                        active_rel.clear()
                        active_rel.update(properties)
                        self.graph.push(active_rel)
                        rem_rel = active_rel
                        break
                if rem_rel is not None:
                    active_rels.remove(rem_rel)
                else:
                    rels_to_create.append(Relationship(node, rel_type, trgt_node, **properties))
        if rels_to_create or nodes_to_create:
            self.graph.create(Subgraph(nodes=nodes_to_create, relationships=rels_to_create))
        if len(active_rels) > 0:
            ids = []
            for active_rel in active_rels:
                ids.append(active_rel.identity)
            self.graph.separate(Subgraph(relationships=active_rels))
            print("onSMDRelDeletedEvent/" + "/".join(map(str, ids)))
            # for active_rel in active_rels:
            #     print(dir(active_rel))
            #     print(active_rel)
            #     print(f"onSMDRelDeletedEvent/{active_rel.identity}")

    def on_created(self):
        def _on_created(event):
            if smdc.DEBUG:
                print("On created", event.src_path, flush=True)
            # TODO: What if this name already exists in the vault? Does it make sense to override old data?
            note = parse_note(self.input_format, event.src_path, self.args)
            self._process_node_on_graph(note)
        return wrapper(_on_created)

    def on_deleted(self):
        def _on_deleted(event):
            if smdc.DEBUG:
                print("On deleted", event.src_path, flush=True)
            name = note_name(event.src_path)
            node = self.nodes.match(name=name).first()
            node_id = node.identity
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
            print(f"onSMDDeletedEvent/{node_id}", flush=True)
        return wrapper(_on_deleted)

    def on_modified(self):
        def _on_modified(event):
            if smdc.DEBUG:
                print("On modified", event.src_path, flush=True)
            note = parse_note(self.input_format, event.src_path, self.args)
            self._process_node_on_graph(note)
            print(f"onSMDModifyEvent/{note.name}", flush=True)
        return wrapper(_on_modified)

    def on_moved(self):
        def _on_moved(event):
            if smdc.DEBUG:
                print("On moved", event.src_path, event.dest_path, flush=True)
            old_name = note_name(event.src_path)
            node = self.nodes.match(name=old_name).first()
            new_name = note_name(event.dest_path)
            # TODO: What if this name already exists in the vault?
            node['name'] = new_name
            node['obsidian_url'] = obsidian_url(new_name, self.vault_name)
            node[PROP_PATH] = event.dest_path
            self.graph.push(node)
            print(f"onSMDMovedEvent/{old_name}/{new_name}", flush=True)
        return wrapper(_on_moved)

def stream(graph, tags, communities, args):
    # Code credit: http://thepythoncorner.com/dev/how-to-create-a-watchdog-in-python-to-look-for-filesystem-changes/
    event_handler = PatternMatchingEventHandler(patterns=["*.md"], case_sensitive=True)

    smds_event_handler = SMDSEventHandler(graph, tags, communities, args)
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
    graph, tags, communities = convert(args)
    # return
    # Start the server
    stream(graph, tags, communities, args)


if __name__ == "__main__":
    main()
