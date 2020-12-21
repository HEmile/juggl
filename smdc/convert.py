import smdc.parse as parse
from smdc import convert_args
from smdc.format import FORMAT_TYPES


def convert(args):
    notes = parse.parse_folder(FORMAT_TYPES[args.input_format], args)
    return FORMAT_TYPES[args.output_format].write(notes, args)


def main():
    args = convert_args()
    convert(args)


if __name__ == "__main__":
    main()
