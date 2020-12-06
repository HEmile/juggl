import parse
import argparse
from format import FORMAT_TYPES

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert different typed links representations of Markdown into other formats.')
    parser.add_argument('--input', metavar='i', type=str, default="markdown",
                        help='directory with markdown files')
    parser.add_argument('--output', metavar='o', type=str, default="out",
                        help='directory for output files')
    parser.add_argument('--input_format', metavar='f', type=str, default="typed_list",
                        help='format of inputs')
    parser.add_argument('--output_format', metavar='r', type=str, default="cypher",
                        help='format of inputs')
    parser.add_argument('--extension', metavar='e', type=str, default=".md",
                        help='extension of markdown files')
    parser.add_argument('-r', action="store_false", default=True)
    args = parser.parse_args()
    print(args.__dir__())
    notes = parse.parse_folder(FORMAT_TYPES[args.input_format], notes_path=args.input, recursive=args.r, note_extension=args.extension)
    FORMAT_TYPES[args.output_format].write(args.output, notes)