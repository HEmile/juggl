import argparse
from pathlib import Path

import smdc

def _mutual_args(parser):
    parser.add_argument('--input', metavar='i', type=str, default=".",
                        help='directory with markdown files')
    parser.add_argument('--input_format', metavar='f', type=str, default="typed_list",
                        help='format of inputs')
    parser.add_argument('--extension', metavar='e', type=str, default=".md",
                        help='extension of markdown files')
    parser.add_argument('--retaindb', action="store_true", default=False)
    parser.add_argument('--password', metavar='p', type=str, default="")
    parser.add_argument("--vault_name", metavar='n', type=str, default=None, help="Defaults to input directory name")
    parser.add_argument("--batch_size", metavar='b', type=int, default=75, help="Batch size for sending to neo4j")
    parser.add_argument("--debug", action="store_true", help="Debug mode")
    parser.add_argument("--index_content", action="store_true", help="Use to index the content in neo4j. Can highly impact performance")
    parser.add_argument('-r', action="store_false", default=True)

def server_args():
    parser = argparse.ArgumentParser(
        description='Stream changes in Obsidian vaults to active neo4j server.')
    _mutual_args(parser)
    args = parser.parse_args()
    if not args.vault_name:
        args.vault_name = Path(args.input).name
    if args.debug:
        smdc.DEBUG = True
        print(args)
    return args

def convert_args():
    parser = argparse.ArgumentParser(
        description='Convert different typed links representations of Markdown into other formats.')
    _mutual_args(parser)
    parser.add_argument('--output_format', metavar='r', type=str, default="neo4j",
                        help='format of inputs')
    parser.add_argument('--output', metavar='o', type=str, default="out",
                        help='directory for output files')
    args = parser.parse_args()
    if not args.vault_name:
        args.vault_name = Path(args.input).name
    if args.debug:
        smdc.DEBUG = True
        print(args)
    return args
