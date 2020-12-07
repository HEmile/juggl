from pathlib import Path
from smdc.format import Format
from tqdm import tqdm
import os


def parse_folder(format: Format, notes_path="", recursive=True, note_extension='.md'):
    if recursive:
        iterate = Path(notes_path).rglob("*" + note_extension)
    else:
        iterate = Path(notes_path).glob("*" + note_extension)
    all_files = list(iterate)
    parsed_notes = {}
    for path in tqdm(all_files):
        with open(path, mode='r') as f:
            name = os.path.basename(path)[:-len(note_extension)]
            parsed_notes[name] = format.parse(f, name, parsed_notes)
    return parsed_notes

