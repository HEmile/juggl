from pathlib import Path
from smdc.format import Format
from tqdm import tqdm
import os
from urllib.parse import quote

PROP_OBSIDIAN_URL = "obsidian_url"
PROP_PATH = "SMD_path"
PROP_VAULT = "SMD_vault"

def note_name(path, extension=".md"):
    return os.path.basename(path)[:-len(extension)]

def obsidian_url(name:str, vault:str) -> str:
    return "obsidian://open?vault=" + quote(vault) + "&file=" + quote(name) + ".md"

def parse_note(format: Format, note_path, args):
    name = note_name(note_path)
    with open(Path(note_path), 'r', encoding='utf-8') as f:
        # TODO: This isn't passing parsed notes right now. But this isn't currently used.
        note = format.parse(f, name, [], args)
        # Assign automatic properties for handling data and plugins
        note.properties[PROP_OBSIDIAN_URL] = obsidian_url(name, args.vault_name)
        note.properties[PROP_PATH] = note_path
        note.properties[PROP_VAULT] = args.vault_name
        return note

def parse_folder(format: Format, args):
    notes_path = args.input
    note_extension = args.extension
    vault_name = args.vault_name
    if args.r:
        iterate = Path(notes_path).rglob("*" + note_extension)
    else:
        iterate = Path(notes_path).glob("*" + note_extension)
    all_files = list(iterate)
    parsed_notes = {}
    print("Parsing notes")
    for path in tqdm(all_files):
        with open(path, mode='r', encoding='utf-8') as f:
            name = note_name(path, note_extension)
            try:
                note = format.parse(f, name, parsed_notes, args)
                note.properties[PROP_OBSIDIAN_URL] = obsidian_url(name, vault_name)
                note.properties[PROP_PATH] = path
                note.properties[PROP_VAULT] = vault_name
                parsed_notes[name] = note
            except Exception as e:
                print(e)
                print("Exception raised during parsing " + str(path) + ". Skipping this note! Please report this.")
    return parsed_notes

