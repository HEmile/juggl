import smdc.parse as parse
from smdc.format import FORMAT_TYPES
import argparse


def convert(args):
    vault_name = args.vault_name
    if not vault_name:
        vault_name = args.input
    notes = parse.parse_folder(FORMAT_TYPES[args.input_format], notes_path=args.input, recursive=args.r,
                               note_extension=args.extension, vault_name=vault_name)
    FORMAT_TYPES[args.output_format].write(notes, args)


def main():
    parser = argparse.ArgumentParser(
        description='Convert different typed links representations of Markdown into other formats.')
    parser.add_argument('--input', metavar='i', type=str, default="markdown",
                        help='directory with markdown files')
    parser.add_argument('--output', metavar='o', type=str, default="out",
                        help='directory for output files')
    parser.add_argument('--input_format', metavar='f', type=str, default="typed_list",
                        help='format of inputs')
    parser.add_argument('--output_format', metavar='r', type=str, default="neo4j",
                        help='format of inputs')
    parser.add_argument('--extension', metavar='e', type=str, default=".md",
                        help='extension of markdown files')
    parser.add_argument('--retaindb', action="store_true", default=False)
    parser.add_argument('--password', metavar='p', type=str, default="")
    parser.add_argument("--vault_name", metavar='n', type=str, default=None, help="Defaults to input directory name")
    parser.add_argument("--batch_size", metavar='b', type=int, default=75, help="Batch size for sending to neo4j")
    parser.add_argument('-r', action="store_false", default=True)
    args = parser.parse_args()
    convert(args)


if __name__ == "__main__":
    main()
