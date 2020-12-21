import abc
from smdc.note import Note
import io

class Format(abc.ABC):

    @abc.abstractmethod
    def parse(self, file: io.TextIOWrapper, name: str, parsed_notes: [Note], args) -> Note:
        ...

    @abc.abstractmethod
    def write(self, parsed_notes: [Note], args):
        ...