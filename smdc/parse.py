from pathlib import Path
from smdc.format import Format
from tqdm import tqdm
import os

def obsidian_url(name:str, vault:str) -> str:
    return "obsidian://open?vault=" + vault + "&file=" + name.replace(" ", "%20") + ".md"

def parse_folder(format: Format, notes_path="", recursive=True, note_extension='.md', vault_name="", add_obsidian_url=True):
    if recursive:
        iterate = Path(notes_path).rglob("*" + note_extension)
    else:
        iterate = Path(notes_path).glob("*" + note_extension)
    all_files = list(iterate)
    parsed_notes = {}
    print("Parsing notes")
    for path in tqdm(all_files):
        with open(path, mode='r', encoding='utf-8') as f:
            name = os.path.basename(path)[:-len(note_extension)]
            try:
                note = format.parse(f, name, parsed_notes)
                note.properties["obsidian_url"] = obsidian_url(name, vault_name)
                parsed_notes[name] = note
            except Exception as e:
                print(e)
                print("Exception raised during parsing " + path + ". Skipping this note! Please report this.")
    return parsed_notes

